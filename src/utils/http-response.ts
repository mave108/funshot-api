import { Response } from 'express';

export enum HTTPStatus {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500,
  }

  export enum HTTPMessage {
    CREATED = "Record created successfully",
    UPDATED = "Record updated successfully",
    DELETED = "Record deleted successfully",
    NOT_FOUND = "No record found",
  }

  export interface ApiResponseProps<T> {
    isSuccess: boolean;
    statusCode: HTTPStatus;
    message?: string;
    theResObj: Response;
    data?: T;
  }


  

  
  export default class ApiResponse {
    protected isSuccess: boolean;
    protected statusCode: HTTPStatus;
    protected message: string;
    protected theResObj: Response;
    protected data: any;
  
    constructor(res: Response) {
      this.theResObj = res;
      this.statusCode = 200;
      this.isSuccess = true;
      this.message = '';
      this.data = {};
    }
    setSuccess(isSuccess: boolean): ApiResponse {
      this.isSuccess = isSuccess;
      return this;
    }
    setStatus(statusCode: HTTPStatus): ApiResponse {
      this.statusCode = statusCode;
      if (statusCode !== HTTPStatus.OK) {
        this.isSuccess = false;
      }
      return this;
    }
    setMsg(message: string): ApiResponse {
      this.message = message;
      return this;
    }
    setData(identifier: string, data: any): ApiResponse {
      this.data[identifier] = data;
      return this;
    }
    send() {
      const { theResObj, ...responseBody } = this;
      return this.theResObj
        .status(this.statusCode)
        .json({ ...responseBody })
        .end();
    }
  }
