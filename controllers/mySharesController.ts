import asyncHandler from "express-async-handler";
import { type Request, type Response, type NextFunction } from "express";
import { matchedData, query, validationResult } from "express-validator";
import db from "../db/db";
import { isLoggedIn } from "../middleware/auth";
import {
  injectDateTimeIntoLocals,
  injectHEIntoLocals,
} from "../middleware/utils";
import he from "he";
export const mySharesGet = [
  isLoggedIn,
  injectHEIntoLocals,
  injectDateTimeIntoLocals,
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 5, max: 20 }),
  query("q").optional().isLength({ max: 50 }),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // TODO: paginate the shares
    const valResult = validationResult(req);
    const data = matchedData(req);
    let page: number | undefined;
    let limit: number | undefined;
    let query: string | undefined;
    if (!valResult.isEmpty()) {
      const validErrors = valResult.mapped();
      if (validErrors.page) {
        page = 1;
      }
      if (validErrors.limit) {
        limit = 10;
      }
      if (validErrors.q) {
        query = undefined;
      }
    }
    if (limit === undefined) {
      limit = parseInt(data.limit || "10");
    }
    if (page === undefined) {
      page = parseInt(data.page || "1");
    }
    query = data.q;

    const totalShares = await db.share.count({
      where: {
        createdBy: req.user?.id,
      },
    });
    const totalPages = Math.ceil((totalShares === 0 ? 1 : totalShares) / limit);
    if (page > totalPages) {
      page = totalPages;
    }
    const offset = (page - 1) * limit;
    const shares = await db.share.findMany({
      where: query
        ? {
            createdBy: req.user?.id,
            folderShared: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          }
        : {
            createdBy: req.user?.id,
          },
      select: {
        id: true,
        createdAt: true,
        createdBy: true,
        expiresAt: true,
        folderShared: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: "desc",
      },
    });

    let queryString: string | undefined;
    if (query) {
      const url = new URLSearchParams();
      url.set("q", query);
      queryString = url.toString();
    }
    const pagesArr = Array.from({ length: totalPages }).map((_, idx) => {
      return {
        num: idx + 1,
        href: `/my-shares?page=${idx + 1}&limit=${limit}${queryString ? `&q=${queryString}` : ""}`,
      };
    });
    res.render("myShares", {
      title: `${he.decode(req.user?.firstName!)}'s Shares`,
      shares,
      query,
      currentPage: page,
      limit,
      pagesArr,
    });
  }),
];
