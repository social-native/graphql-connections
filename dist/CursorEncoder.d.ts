interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}
declare class CursorEncoder {
    static encodeToCursor<CursorObj>(cursorObj: CursorObj): string;
    static decodeFromCursor<CursorObj>(cursor: string): CursorObj;
}
export { CursorEncoder, ICursorEncoder };
