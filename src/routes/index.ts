import express from "express";
import tagRouter from './tags/tags';
import postRouter from './post/post';
import uploadRouter from './upload/upload';

  let router = express.Router();

  router.use('/tags', tagRouter);
  router.use('/post', postRouter);
  router.use('/upload', uploadRouter);
  //Export the router
  export default router;