import express from 'express';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
export const profilesRouter = express.Router();
const PROFILE_DIR = process.env.PROFILE_DIR || '/data/profiles';
const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
const LOCALAI_BASE_URL =
  process.env.LOCALAI_BASE_URL || 'http://localai:8080';
const SAFE_SEGMENT_RE = /^[a-zA-Z0-9._-]+$/;
function isSafeSegment(segment) {
  if (typeof segment !== 'string') return false;
  if (!segment) return false;
  if (segment === '.' || segment === '..') return false;
  return SAFE_SEGMENT_RE.test(segment);
}


function parseProfileRelPath(relPath) {
  if (typeof relPath !== 'string') {
    const error = new Error('Invalid profile path');
    error.statusCode = 400;
    throw error;
  }
  const rel = String(relPath).trim();
  if (!rel || rel.startsWith('/') || rel.includes('\\') || rel.includes('..')) {
    const error = new Error('Invalid profile path');
    error.statusCode = 400;
    throw error;
  }
  const parts = rel.split('/');
  if (parts.length !== 3) {
    const error = new Error('Invalid profile path');
    error.statusCode = 400;
    throw error;
  }
  const [ai, model, file] = parts;
  if (!isSafeSegment(ai) || !isSafeSegment(model) || !isSafeSegment(file) || !file.endsWith('.json')) {
    const error = new Error('Invalid profile path');
    error.statusCode = 400;
    throw error;
  }
  return { ai, model, file, rel };
}


function resolveProfilePath(relPath) {
  const { ai, model, file } = parseProfileRelPath(relPath);
  return path.join(PROFILE_DIR, ai, model, file);
}
profilesRouter.post('/profiles/save', async (req, res) => {
  try {
    const { rel: name } = parseProfileRelPath(req.body?.name);
    const profile = req.body?.profile;
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      return res.status(400).json({ error: 'Invalid profile payload' });
    }
    const targetPath = resolveProfilePath(name);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, `${JSON.stringify(profile, null, 2)}\n`, 'utf8');
    return res.json({ ok: true, path: name });
  } catch (error) {
    if (error && error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Failed to save profile' });
  }
});
profilesRouter.get('/profiles/list', async (_req, res) => {
  try {
    await mkdir(PROFILE_DIR, { recursive: true });
    const aiEntries = await readdir(PROFILE_DIR, { withFileTypes: true });
    const files = [];
    for (const aiEntry of aiEntries) {
      if (!aiEntry.isDirectory()) continue;
      const ai = aiEntry.name;
      if (!isSafeSegment(ai)) continue;
      const aiDir = path.join(PROFILE_DIR, ai);
      const modelEntries = await readdir(aiDir, { withFileTypes: true });
      for (const modelEntry of modelEntries) {
        if (!modelEntry.isDirectory()) continue;
        const model = modelEntry.name;
        if (!isSafeSegment(model)) continue;
        const modelDir = path.join(aiDir, model);
        const profileEntries = await readdir(modelDir, { withFileTypes: true });
        for (const profileEntry of profileEntries) {
          if (!profileEntry.isFile()) continue;
          const filename = profileEntry.name;
          if (!isSafeSegment(filename) || !filename.endsWith('.json')) continue;
          files.push(path.posix.join(ai, model, filename));
        }
      }
    }
    files.sort((a, b) => a.localeCompare(b));
    return res.json(files);
  } catch (error) {
    if (error && error.code === 'ENOENT') return res.json([]);
    return res.status(500).json({ error: 'Failed to list profiles' });
  }
});
profilesRouter.get('/profiles/models', async (_req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch models' });
    }
    const data = await response.json();
    const ollama = (data.models || []).map((m) => m.name);
    let localai = [];
    try {
      const localResponse = await fetch(`${LOCALAI_BASE_URL}/v1/models`);
      if (localResponse.ok) {
        const localData = await localResponse.json();
        localai = Array.isArray(localData?.data)
          ? localData.data.map((m) => m?.id).filter(Boolean)
          : [];
      }
    } catch {
      // keep localai empty if unavailable
    }
    return res.json({ ollama, localai });
  } catch (err) {
    console.error('Model fetch error:', err);
    return res.status(500).json({ error: 'Model fetch failed' });
  }
});
profilesRouter.get('/profiles/:name', async (req, res) => {
  try {
    const { rel: name } = parseProfileRelPath(req.params?.name);
    const raw = await readFile(resolveProfilePath(name), 'utf8');
    res.type('application/json');
    return res.send(raw);
  } catch (error) {
    if (error && error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error && error.code === 'ENOENT') return res.status(404).json({ error: 'Profile not found' });
    return res.status(500).json({ error: 'Failed to read profile' });
  }
});

