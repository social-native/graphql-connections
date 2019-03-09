interface ICursorManager<CursorObj> {
    createCursor: (cursorObj: CursorObj) => string;
    getCursorObj: (cursor: string) => CursorObj;
}

class CursorManager {
    public static createCursor<CursorObj>(cursorObj: CursorObj) {
        const buff = new Buffer(JSON.stringify(cursorObj));
        return buff.toString('base64');
    }

    public static getCursorObj<CursorObj>(cursor: string) {
        const buff = new Buffer(cursor, 'base64');
        const json = buff.toString('ascii');
        return JSON.parse(json) as CursorObj;
    }
}

export {CursorManager, ICursorManager};
