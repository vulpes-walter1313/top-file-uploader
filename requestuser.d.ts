import * as express from "express";
declare global {
  namespace Express {
    interface User {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      isAdmin: boolean;
    }
  }
}
