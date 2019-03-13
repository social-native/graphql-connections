export default class CursorEncoder {
    static encodeToCursor<CursorObj>(cursorObj: CursorObj): string;
    static decodeFromCursor<CursorObj>(cursor: string): CursorObj;
}
