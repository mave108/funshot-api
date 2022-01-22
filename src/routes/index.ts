import  express from "express";
import  tagRouter from './tag/tag';

    let router = express.Router();

    router.use('/tag', tagRouter);

  // Export the router
  export default
   router;