interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}

class CursorEncoder {
    public static encodeToCursor<CursorObj>(cursorObj: CursorObj) {
        const buff = Buffer.from(JSON.stringify(cursorObj));
        return buff.toString('base64');
    }

    public static decodeFromCursor<CursorObj>(cursor: string) {
        const buff = Buffer.from(cursor, 'base64');
        const json = buff.toString('ascii');
        return JSON.parse(json) as CursorObj;
    }
}

export {CursorEncoder, ICursorEncoder};
