import {Router, Request, Response, NextFunction} from "express";
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';
import fs from 'node:fs';
import { FileUploadProps } from './types';
import HTTPResponse, { HTTPStatus, HTTPMessage } from '../../utils/http-response';
import S3 from 'aws-sdk/clients/s3';
import RedisClient from '../../db/redis';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath.path);
let router = Router();

router.post('/', async (req: Request, res: Response, next:NextFunction) => {        
    try {
        if (!req.files || Object.keys(req.files).length === 0) {        
            new HTTPResponse(res)
                .setStatus(HTTPStatus.BAD_REQUEST)
                .setMsg('No files were uploaded.')
                .send();
            }
        let fileToUpload: FileUploadProps;
        let fileExt: string;
        let rootDir = path.resolve('./');
        if (req.files && req.files.hasOwnProperty('video')) {  
            fileToUpload = req.files.video as FileUploadProps;  
            fileExt = path.extname(fileToUpload.name);  
            if (fileToUpload.mimetype != 'video/mp4') {        
                return new HTTPResponse(res)
                    .setStatus(HTTPStatus.BAD_REQUEST)
                    .setMsg('bad media file')
                    .send();
            }  
            
            let videoId = uuidv4();
            let fileDestination = `${rootDir}/temp/${videoId}${fileExt}`;                           
            //upload file
            fileToUpload.mv(fileDestination, async (e) => {
                if(e) {                        
                    return new HTTPResponse(res)
                        .setStatus(HTTPStatus.INTERNAL_SERVER_ERROR)
                        .setMsg('Something went wrong while uploading to server.')
                        .setData('error', e)
                        .send();
                }
                const readStream = fs.createReadStream(fileDestination); 
                //save to s3
                const s3 = new S3({
                    accessKeyId: process.env.AWS_ACCESS_KEY,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    region: process.env.AWS_S3_BUCKET_REGION
                });
                const s3url = `${new Date().toISOString().slice(0, 10)}/${videoId}`;
                 //genrate thumbnail                                            
                    ffmpeg(fileDestination)
                        .screenshot({
                            count: 1,
                            filename: `${videoId}.jpeg`,
                            folder: `${rootDir}/temp`,
                            timestamps: [3]
                        })
                        .on('end', async () => {
                            // upload thumnail
                             const screenshotPath = `${rootDir}/temp/${videoId}.jpeg`;
                                const s3ThumbParams = {
                                Bucket: 'funshot-media',
                                Key: `${s3url}.jpeg`,
                                Body: fs.createReadStream(screenshotPath)
                            }
                            await s3.putObject(s3ThumbParams).promise();
                            fs.rm(screenshotPath,()=> {}); //remove local copy
                        });                                                
                const s3Params = {
                    Bucket: 'funshot-media',
                    Key: `${s3url}${fileExt}`,
                    Body: readStream,
                  };                               
                s3.putObject(s3Params).send((err,data) => {
                    if (err) {
                        return new HTTPResponse (res)
                            .setStatus(HTTPStatus.INTERNAL_SERVER_ERROR)
                            .setMsg(HTTPMessage.SOMETHING_WENT_WRONG)                        
                            .send(); 
                    }                    
                    fs.rm(fileDestination,()=> {}); //remove local copy
                    return new HTTPResponse (res)
                        .setStatus(HTTPStatus.OK)
                        .setMsg(HTTPMessage.CREATED)
                        .setData('media', {media_id: videoId, s3_object: data,s3_url: s3url })
                        .send(); 
                });                                             
            });
        }
    } catch (e) {
        new HTTPResponse(res)
            .setStatus(HTTPStatus.BAD_REQUEST)
            .setMsg('Bad request')            
            .send();
    }  
    
});

router.delete('/', async (req: Request, res: Response, next:NextFunction) => {
    try {
        const { post_ids } = req.body;
        const s3 = new S3({
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_S3_BUCKET_REGION
        });
        const s3Objects: {Key: string}[] = [];
        const s3Params = {
            Bucket: 'funshot-media',
            Delete: {                
                Quiet: false,
                Objects: s3Objects
        }}

        await Promise.all([...post_ids].map(async (pid) => {
            //get post details
            const s3Url = await RedisClient.hGet(`POST::${pid}`, 's3_url'); 
            if (s3Url) {
                s3Objects.push({Key: s3Url}) 
            }
            console.error("s3Url", s3Url);
            await RedisClient.hDel(`POST::${pid}`, 's3_url');// delete s3 url
            await RedisClient.hDel(`POST::${pid}`, 'media_id');// delete video id
        }));
        console.error("s3Params", s3Params);
        s3Params.Delete['Objects'] = [...s3Objects];
        const deleteStatus = await s3.deleteObjects(s3Params).promise();
        new HTTPResponse(res)
            .setStatus(HTTPStatus.OK)
            .setMsg(HTTPMessage.DELETED)                                
            .send();
    } catch (e) {
        new HTTPResponse(res)
        .setStatus(HTTPStatus.BAD_REQUEST)
        .setMsg('Bad request')        
        .send();
    }
});


export default router;