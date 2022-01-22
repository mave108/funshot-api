import express from 'express';
import bodyParser from 'body-parser';
import  masterRouter from './routes/index';
import cors from 'cors';

const app = express();
const port = 5001;

app.use(cors());
app.use(bodyParser.json());
app.use('/api', masterRouter);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});