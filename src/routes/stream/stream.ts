import {Router, Request, Response, NextFunction} from "express";
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../../db/redis';
import HTTPResponse, { HTTPStatus, HTTPMessage } from '../../utils/http-response';
import S3 from 'aws-sdk/clients/s3';
import concat from 'concat-stream'

let router = Router();

router.get('/image/:id', async (req: Request, res: Response, next:NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return new HTTPResponse(res)
                    .setStatus(HTTPStatus.BAD_REQUEST)
                    .setMsg("id is missing")
                    .send();
        }        
        //get post
        const post = await redisClient.hGetAll(`POST::${id}`);  
        if (!post) {
            return new HTTPResponse(res)
                    .setStatus(HTTPStatus.BAD_REQUEST)
                    .setMsg("invalid id")
                    .send();
        }     
        
        const s3 = new S3({
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_S3_BUCKET_REGION,            
        });
        var params = {Bucket: 'funshot-media', Key: `${post.s3_url}.jpeg`};
        const streamData =  await s3.getObject(params).promise();   
        if (streamData && streamData.Body) {    
            // const image = Buffer.from(streamData.Body.toString()).toString("base64");
            res.writeHead(200, {
                'Content-Type': 'image/jpeg',                 
            });
            res.write(streamData.Body, 'binary');
            res.end(null, 'binary');            
        }

        return new HTTPResponse(res)
                    .setStatus(HTTPStatus.NOT_FOUND)
                    .setMsg(HTTPMessage.NOT_FOUND)
                    .send();
        
    } catch (e) {
        return next(e);
    }
    
    // await redisClient.quit();    
});

export default router;