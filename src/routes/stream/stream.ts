import {Router, Request, Response, NextFunction} from "express";
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../../db/redis';
import HTTPResponse, { HTTPStatus } from '../../utils/http-response';
import S3 from 'aws-sdk/clients/s3';

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
            res.writeHead(200, {
                'Content-Type': 'image/jpeg',                 
            });
            res.write(streamData.Body, 'binary');
            res.end(null, 'binary');            
        }                
    } catch (e) {
        return next(e);
    } 
});


router.get('/video/:id', async (req: Request, res: Response, next:NextFunction) => {
    try {
        const { id } = req.params;
        const { range } = req.headers;
        if (!range) {
            return new HTTPResponse(res)
                    .setStatus(HTTPStatus.BAD_REQUEST)
                    .setMsg("Requires Range header")
                    .send();            
        }
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
        const CHUNK_SIZE = 10 ** 6; // 1MB        
        const fileInfo = await s3.headObject({
            Bucket: 'funshot-media', 
            Key: `${post.s3_url}.mp4`,
        }).promise();
        if(!fileInfo) {
            return new HTTPResponse(res)
                .setStatus(HTTPStatus.INTERNAL_SERVER_ERROR)
                .setMsg("No video found")
                .send();
        }
        const videoSize = fileInfo && fileInfo.ContentLength || 0;
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)    
        // const start = Number(range.replace(/\D/g, ""));                
        const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
        console.error("start and end", start, end, parts);
        const contentLength = end - start + 1;
        var params = {
            Bucket: 'funshot-media', 
            Key: `${post.s3_url}.mp4`,
            Range: `bytes=${start}-${end}`
        };
        console.error("params", params);
        const streamData =  await s3.getObject(params).createReadStream();  
        const headers = {
            "Content-Range": `bytes ${start}-${end}/${videoSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": contentLength,
            "Content-Type": "video/mp4",
        };
        res.writeHead(206, headers);
        streamData.pipe(res);     
        // streamData.on('end', () => {
        //     res.end();
        // });  
    } catch (e) {
        next(e);
    }
});

export default router;