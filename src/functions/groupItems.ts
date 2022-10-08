/**
 * @example
 * splitBlockList([0, 1, 2, 3, 4, 5, 6, 7, 8], 4) => [[0, 1, 2, 3], [4, 5, 6, 7], [8]]
 */
export function groupItems<T>(array: T[], blockGroupSize = 16): T[][] {
  const blockList: T[][] = []
  let prevBlockIndex = 0
  for (let blockIndx = blockGroupSize; blockIndx - blockGroupSize < array.length; blockIndx += blockGroupSize) {
    const newList = array.slice(prevBlockIndex, blockIndx)
    blockList.push(newList)
    prevBlockIndex = blockIndx
  }
  return blockList
}
