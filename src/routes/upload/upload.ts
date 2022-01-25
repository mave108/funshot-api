import {Router, Request, Response, NextFunction} from "express";
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';
import fs from 'node:fs';
import { FileUploadProps } from './types';
import HTTPResponse, { HTTPStatus, HTTPMessage } from '../../utils/http-response';
import S3 from 'aws-sdk/clients/s3';

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
            //upload file
            let videoId = uuidv4();
            let fileDestination = `${rootDir}/temp/${videoId}${fileExt}`;
            fileToUpload.mv(fileDestination, async (e) => {
                if(e) {                        
                    return new HTTPResponse(res)
                        .setStatus(HTTPStatus.INTERNAL_SERVER_ERROR)
                        .setMsg('Something went wrong while uploading to server.')
                        .setData('error', e)
                        .send();
                }
                //save to s3
                const s3 = new S3({
                    accessKeyId: process.env.AWS_ACCESS_KEY,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    region: 'ap-south-1'
                });
                const readStream = fs.createReadStream(fileDestination);
                const s3url = `${new Date().toISOString().slice(0, 10)}/${videoId}${fileExt}`;
                const s3Params = {
                    Bucket: 'funshot-media',
                    Key: s3url,
                    Body: readStream,
                  };
                s3.putObject(s3Params).send((err,data) => {
                    if (err) {
                        return new HTTPResponse (res)
                            .setStatus(HTTPStatus.INTERNAL_SERVER_ERROR)
                            .setMsg(HTTPMessage.SOMETHING_WENT_WRONG)                        
                            .send(); 
                    }
                    //delete the file from here
                    fs.rm(fileDestination,()=> {});
                    return new HTTPResponse (res)
                        .setStatus(HTTPStatus.OK)
                        .setMsg(HTTPMessage.CREATED)
                        .setData('video', {video_id: videoId, s3_object: data,s3_url: s3url })
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



export default router;