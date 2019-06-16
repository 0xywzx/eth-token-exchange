//tokenを見やすくするために  
export const ether = (n) => {
  return new web3.utils.BN(
    //web３のtoWei()を利用する
    web3.utils.toWei(n.toString(), 'ether')
  )
}  

// Same as ether
export const tokens = (n) => ether(n)

//
export const EVM_REVERT = 'Returned error: VM Exception while processing transaction: revert'

export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

