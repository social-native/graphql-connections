interface ICursorManager<CursorObj> {
    createCursor: (cursorObj: CursorObj) => string;
    getCursorObj: (cursor: string) => CursorObj;
}
declare class CursorManager {
    static createCursor<CursorObj>(cursorObj: CursorObj): string;
    static getCursorObj<CursorObj>(cursor: string): CursorObj;
}
export { CursorManager, ICursorManager };
