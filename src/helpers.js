export const ETHER_ADDRESS = '0x0000000000000000000000000000000000000000'

export const DECIMALS = (10**18)

// Shortcut to aoid passong around web3 connection
export const ether = (wei) => {
  if(wei) {
    return(wei / DECIMALS) // 18 decimals
  } 
}

//token and ether have sane decimal resolution
export const tokens = ether

export const GREEN = 'success'
export const RED = 'danger'

//
export const formatBalance = (balance) => {
  const percision = 100 // 2 decimal places 

  balance = ether(balance)
  balance = Math.round(balance * percision) / percision //Use 2 decimal places
  
  return balance
}