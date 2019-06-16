import { tokens, EVM_REVERT } from './helpers'

const Token = artifacts.require('./Token');

//import chai ans chai as promised
require('chai')
  .use(require('chai-as-promised'))
  .should() 
 
contract('Token', ([deployer, receiver, exchange]) => {
  const name = 'GX Token'
  const symbol = 'GX'
  const decimals = '18'
  const totalSupply = tokens(1000000).toString()
  let token

  //fetch token contract before each async function
  beforeEach(async () => {
    token = await Token.new()
  })

  describe('deployment', () => {
    it ('tracks the name ', async () => {
      //Fetch token contract from blockchain → Read token name → chaeck the token name is "GX Token"
      const result = await token.name()
      result.should.equal(name) 
    })

    it ('track the symbol', async () => {
      const result = await token.symbol()
      result.should.equal(symbol) 
    })

    it ('track the decimal', async () => {
      const result = await token.decimals()
      result.toString().should.equal(decimals) 
    })

    it ('track the total supply', async () => {
      const result = await token.totalSupply()
      result.toString().should.equal(totalSupply) 
    })

    it ('assigns the total supply to the deployer', async() => {
      //ganacheの1番目のアカウント＝コントラクトのデプロイヤー
      const result = await token.balanceOf(deployer)
      result.toString().should.equal(totalSupply)
    })
  })

  describe('sending tokens', () => {
    let amount
    let result

    describe('success', async () => {
      beforeEach(async () => {
        amount = tokens(100)
        result = await token.transfer(receiver, amount, {from: deployer})
      })
  
      it('transfers token balances', async () => {
        let balanceOf
        //before transfer
        // balanceOf = await token.balanceOf(deployer)
        // console.log('deployer balance before transfer', balanceOf.toString()) 
        // balanceOf = await token.balanceOf(receiver)
        // console.log("receiver balance before transfer", balanceOf.toString())
        //transfer
        //await token.transfer(receiver, tokens(100), {from: deployer} )
        //after transfer
        balanceOf = await token.balanceOf(deployer)
        balanceOf.toString().should.equal(tokens(999900).toString())
        //console.log('deployer balance after transfer', balanceOf.toString())
        balanceOf = await token.balanceOf(receiver)
        balanceOf.toString().should.equal(tokens(100).toString())
        //console.log("receiver balance after transfer", balanceOf.toString())
      })
  
      it('emits a transfer event', async () => {
        //console.log(result) ブロックチェーンに書き込まれた際の情報が見れる
        //console.log(result.logs) 関数のログが見れる
        const log = result.logs[0]
        log.event.should.eq(('Transfer'))
        const event = log.args
        event.from.toString().should.equal(deployer, 'frmo is correct')
        event.to.toString().should.equal(receiver, 'to is correct')
        event.value.toString().should.equal(amount.toString(), 'value is correct')
      })
    })

    describe('failure', async () => {
      it('reject insufficient balances', async() => {
        let invalidAmount
        invalidAmount = tokens(10000000000) //greater then total supply
        await token.transfer(receiver, invalidAmount, { from: deployer }).should.be.rejectedWith(EVM_REVERT)

        //Attempt transfer token, when you have none
        invalidAmount = tokens(10)
        await token.transfer(deployer, invalidAmount, { from: receiver }).should.be.rejectedWith(EVM_REVERT)
      })

      it('rejects invalid receipients', async () => {
        await token.transfer(0x0, amount, { from: deployer }).should.be.rejected
      })
    })
  })

  describe('approving tokens', () => {
    let amount
    let result
    beforeEach(async () => {
      amount = tokens(100)
      result = await token.approve(exchange, amount, { from: deployer })
    })

    describe('success', () => {
      it('allocates an allowance for delegted token spending', async() => {
        const allowance = await token.allowance(deployer, exchange)
        allowance.toString().should.equal(amount.toString())
      })

      it('emits a Approval event', async () => {
        //console.log(result) ブロックチェーンに書き込まれた際の情報が見れる
        //console.log(result.logs) 関数のログが見れる
        const log = result.logs[0]
        log.event.should.eq(('Approval'))
        const event = log.args
        event.owner.toString().should.equal(deployer, 'owner is correct')
        event.spender.toString().should.equal(exchange, 'spender is correct')
        event.value.toString().should.equal(amount.toString(), 'value is correct')
      })

    })

    describe('failure', () => {
      it('rejects invalid receipients', async () => {
        await token.approve(0x0, amount, { from: deployer }).should.be.rejected
      })
    }) 
  })

  describe('delegated token transfer', async () => {
    let amount
    let result

    beforeEach(async () => {
      amount = tokens(100)
      await token.approve(exchange, amount, { from: deployer })
    })

    describe('success', async () => {

      beforeEach(async () => {
        result = await token.transferFrom(deployer, receiver, amount, {from: exchange})
      })
  
      it('transfers token balances', async () => {
        let balanceOf
        balanceOf = await token.balanceOf(deployer)
        balanceOf.toString().should.equal(tokens(999900).toString())
        balanceOf = await token.balanceOf(receiver)
        balanceOf.toString().should.equal(tokens(100).toString())
      })

      it('resets the allowance', async () => {
        const allowance = await token.allowance(deployer, exchange)
        allowance.toString().should.equal('0')
      })
  
      it('emits a transfer event', async () => {
        //console.log(result) ブロックチェーンに書き込まれた際の情報が見れる
        //console.log(result.logs) 関数のログが見れる
        const log = result.logs[0]
        log.event.should.eq(('Transfer'))
        const event = log.args
        event.from.toString().should.equal(deployer, 'frmo is correct')
        event.to.toString().should.equal(receiver, 'to is correct')
        event.value.toString().should.equal(amount.toString(), 'value is correct')
      })
    })
 
    describe('failure', async () => {
      it('reject insufficient balances', async() => {
        let invalidAmount
        invalidAmount = tokens(10000000000) //greater then total supply
        await token.transferFrom(deployer, receiver, invalidAmount, { from: exchange }).should.be.rejectedWith(EVM_REVERT)
      })

      it('rejects invalid receipients', async () => {
        await token.transferFrom(deployer, 0x0, amount, { from: exchange }).should.be.rejected
      })
    })
  })

})