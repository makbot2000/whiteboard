import express from 'express';
import cors from 'cors';
import boardsRouter from './routes/boards.js';
import notesRouter from './routes/notes.js';
import columnsRouter from './routes/columns.js';
import groupsRouter from './routes/groups.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/boards', boardsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/groups', groupsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Whiteboard server running on http://localhost:${PORT}`);
});
