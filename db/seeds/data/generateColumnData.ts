interface IUniqueData {
    [dataName: string]: number;
}
interface IGenerateColumnDataConfig {
    makeRandomUnique: boolean;
    fakerFn: () => number | string | undefined;
    dataIsNumber?: boolean;
}
const generateColumnData = <DataType>(
    uniqueData: IUniqueData,
    config: IGenerateColumnDataConfig,
    total: number
) => {
    // generate number of unique data
    let unqiueDataArr = [] as DataType[];
    Object.keys(uniqueData).forEach(data => {
        const count = uniqueData[data];

        const dataToFill = config.dataIsNumber ? +data : data;
        const newData = Array(count).fill(dataToFill);
        unqiueDataArr = [...unqiueDataArr, ...newData];
    });

    const randomDataArr = [] as DataType[];

    // uniqueness checkers
    const checkIfInUnique = (data: DataType) => unqiueDataArr.includes(data);
    const checkIfInRandom = (data: DataType) => randomDataArr.includes(data);
    let isAlreadySeen: (data: DataType) => boolean;
    if (config.makeRandomUnique) {
        isAlreadySeen = data => checkIfInUnique(data) || checkIfInRandom(data);
    } else {
        isAlreadySeen = data => checkIfInUnique(data);
    }

    // generate random data
    Array(total - unqiueDataArr.length)
        .fill(undefined)
        .forEach(() => {
            let newData = (config.fakerFn() as unknown) as DataType;
            while (isAlreadySeen(newData)) {
                newData = (config.fakerFn() as unknown) as DataType;
            }
            randomDataArr.push(newData);
        });

    // return unique and random data
    return {uniqueData: unqiueDataArr, randomData: randomDataArr};
};

export default generateColumnData;
