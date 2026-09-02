import PostalMime from "postal-mime";
import MsgReader from "@kenjiuno/msgreader";

globalThis.EmailParsers = { PostalMime, MsgReader: MsgReader.default || MsgReader };
