import PostalMime from "postal-mime";
import MsgReader from "@kenjiuno/msgreader";
import { unzipSync } from "fflate";
import * as XLSX from "xlsx";
import mammoth from "mammoth/mammoth.browser.js";
import TurndownService from "turndown";

globalThis.EmailParsers = {
  PostalMime, MsgReader: MsgReader.default || MsgReader,
  unzipSync, XLSX, mammoth, TurndownService,
};
