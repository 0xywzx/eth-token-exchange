import { tokens, EVM_REVERT, ETH_ADDRESS, ether } from './helpers'

const Token = artifacts.require('./Token');
const Exchange = artifacts.require('./Exchange');

//import chai ans chai as promised
require('chai')
  .use(require('chai-as-promised'))
  .should() 
 
contract('Exchange', ([deployer, feeAccount, user1, user2]) => {
  let token
  let exchange
  const feePersent = 10

  //fetch token contract before each async function
  beforeEach(async () => {
    //Deploy token
    token = await Token.new()
    //Transfer some tokens to user1
    exchange = await Exchange.new(feeAccount, feePersent)
    //deploy exchange
    token.transfer(user1, tokens(100), { from: deployer })
  })

  describe('deployment', () => {
    it ('tracks the fee account ', async () => {
      const result = await exchange.feeAccount()
      result.should.equal(feeAccount) 
    })

    it ('tracks the fee percent ', async () => {
      const result = await exchange.feePersent()
      result.toString().should.equal(feePersent.toString()) 
    })
    
  })

  describe('fallback', () => {
    it('reverts when Ether is sent', async () => {
      await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(EVM_REVERT)
    })
  })

  describe('depositing ether', async () => {
    let result
    let amount 

    beforeEach(async() => {
      amount = ether(1)
      result = await exchange.depositEther({ from: user1, value: amount})
    })

    it('tracks the ether deposit', async() => {
      const balance = await exchange.tokens(ETH_ADDRESS, user1)
      balance.toString().should.equal(amount.toString())
    })

    it('emits a deposit event', async () => {
      const log = result.logs[0]
      log.event.should.eq(('Deposit'))
      const event = log.args
      event.token.should.equal(ETH_ADDRESS, 'ether address is correct')
      event.user.should.equal(user1, 'user address is correct')
      event.amount.toString().should.equal(amount.toString(), 'amount is correct')
      event.balance.toString().should.equal(amount.toString(), 'balance is correct')
    })
  })

  describe('withdraw ether', async () => {
    let result

    beforeEach(async() => {
      //deposit ether first
      await exchange.depositEther({ from: user1, value: ether(1) })
    })

    describe('suceess', async() => {
      beforeEach(async () => {
        //Withdeaw ether
        result = await exchange.withdrawEther(ether(1), { from: user1 })
      })

      it('withdraw Ether funds', async () => {
        const balance = await exchange.tokens(ETH_ADDRESS, user1)
        balance.toString().should.equal('0')
      })

      it('emits a withdraw event', async () => {
        const log = result.logs[0]
        log.event.should.eq(('Withdraw'))
        const event = log.args
        event.token.should.equal(ETH_ADDRESS, 'ETH_ADDRESS is correct')
        event.user.should.equal(user1, 'user address is correct')
        event.amount.toString().should.equal(ether(1).toString(), 'amount is correct')
        event.balance.toString().should.equal(ether(0).toString(), 'balance is correct')
      })

    })

    describe('failure', async () => {
      it('rejects withdraws for insufficient balances', async () => {
        await exchange.withdrawEther(ether(100), {from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })
    })
  })

  describe('depositing tokens', () => {
    let result 
    let amount

    describe('success', () => {

      beforeEach(async () => {
        amount = tokens(10)
        await token.approve(exchange.address, amount, { from: user1 })
        result = await exchange.depositToken(token.address, amount, { from: user1 })
      })

      it ('tracks the token deposit', async () => {
        // chack the token balances
        let balance
        balance = await token.balanceOf(exchange.address)
        balance.toString().should.equal(amount.toString())
        //Check tokens on exchange
        balance = await exchange.tokens(token.address, user1)
        balance.toString().should.equal(amount.toString())
      })

      it('emits a deposit event', async () => {
        const log = result.logs[0]
        log.event.should.eq(('Deposit'))
        const event = log.args
        event.token.should.equal(token.address, 'token address is correct')
        event.user.should.equal(user1, 'user address is correct')
        event.amount.toString().should.equal(tokens(10).toString(), 'amount is correct')
        event.balance.toString().should.equal(tokens(10).toString(), 'balance is correct')
      })
    })
    
    describe('failure', () => {
      it('reject Ether deposites', async() => {
        await exchange.depositToken(ETH_ADDRESS, tokens(10), {from: user1}).should.be.rejectedWith(EVM_REVERT)
      })

      it('fails when no token are approved', async () => {
        //Don't approve any tokens before depositing 
        await exchange.depositToken(token.address, tokens(10), {from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })
    })

  })

  describe('withdraw token', async () => {
    let result
    let amount

    describe('suceess', async() => {
      beforeEach(async () => {
        //deposit ether first
        amount = tokens(10)
        await token.approve(exchange.address, amount, { from: user1 })
        await exchange.depositToken(token.address, amount, { from: user1 })
        //Withdeaw ether
        result = await exchange.withdrawToken(token.address, amount, { from: user1 })
      })

      it('withdraw token funds', async () => {
        const balance = await exchange.tokens(token.address, user1)
        balance.toString().should.equal('0')
      })

      it('emits a withdraw event', async () => {
        const log = result.logs[0]
        log.event.should.eq(('Withdraw'))
        const event = log.args
        event.token.should.equal(token.address)
        event.user.should.equal(user1)
        event.amount.toString().should.equal(amount.toString())
        event.balance.toString().should.equal('0')
      })

    })

    describe('failure', async () => {
      it('rejects ether withdraws', async () => {
        await exchange.withdrawToken(ETH_ADDRESS, tokens(10), {from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })
      it('fails for insufficient balanses', async () => {
        await exchange.withdrawToken(token.address, tokens(100), {from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })
    })
  })

  describe('making orders', async () => {
    let result
    beforeEach(async () => {
      result = await exchange.makeOrder(token.address, tokens(1), ETH_ADDRESS, ether(1), {from: user1})
    })

    it('tracks the newly created orders', async () => {
      const orderCount = await exchange.orderCount()
      orderCount.toString().should.eq('1')
      const order = await exchange.orders('1')
      order.id.toString().should.equal('1', 'id is correct')
      order.user.should.equal(user1, 'user is correct')
      order.tokenGet.should.equal(token.address, 'tokenGet is correct')
      order.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
      order.tokenGive.should.equal(ETH_ADDRESS, 'tokenGive is correct')
      order.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
      order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
    })

    it('emit an order event', async () => {
      const log = result.logs[0]
      log.event.should.eq(('Order'))
      const event = log.args
      event.id.toString().should.equal('1', 'is is correct')
      event.user.should.equal(user1, 'user is correct')
      event.tokenGet.should.equal(token.address, 'tokenGet is correct')
      event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
      event.tokenGive.should.equal(ETH_ADDRESS, 'tokenGive is correct')
      event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
    })
  })

  describe('order actions' ,async () => {

    beforeEach(async () => {
      //user1 deposits ether only
      await exchange.depositEther({ from: user1, value: ether(1)})
      //give tokens to user2
      await token.transfer(user2, tokens(100), { from: deployer })
      //user2 deposites token only 
      await token.approve(exchange.address, tokens(2), { from: user2 })
      await exchange.depositToken(token.address, tokens(2), { from: user2 })
      //user1 make an order to buy tiken with ether
      await exchange.makeOrder(token.address, tokens(1), ETH_ADDRESS, ether(1), {from: user1})
    })

    describe('filling the orders', async() => {
      let result

      describe('success', async () => {

        beforeEach( async() => {
          result = await exchange.fillOrder('1', { from: user2 })
        })

        it('excutes the trade & charge fees', async () => {
          let balance
          balance = await exchange.balanceOf(token.address, user1)
          balance.toString().should.equal(tokens(1).toString(), 'user1 received token');
          balance = await exchange.balanceOf(ETH_ADDRESS, user2)
          balance.toString().should.equal(ether(1).toString(), 'user2 received ether');
          balance = await exchange.balanceOf(ETH_ADDRESS, user1)
          balance.toString().should.equal('0'.toString(), 'user1 Ether deducted');
          balance = await exchange.balanceOf(token.address, user2)
          balance.toString().should.equal(tokens(0.9).toString(), 'user2 tokens deducted with the fee applied');
          const feeAccount = await exchange.feeAccount()
          balance = await exchange.balanceOf(token.address, feeAccount)
          balance.toString().should.equal(tokens(0.1).toString(), 'feeAccount received fee');
        })

        it('updates fill order', async () => {
          const orderFilled = await exchange.orderFilled(1)
          orderFilled.should.equal(true) 
        })

        it('emit an trade event', async () => {
          const log = result.logs[0]
          log.event.should.eq(('Trade'))
          const event = log.args
          event.id.toString().should.equal('1', 'is is correct')
          event.user.should.equal(user1, 'user is correct')
          event.tokenGet.should.equal(token.address, 'tokenGet is correct')
          event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
          event.tokenGive.should.equal(ETH_ADDRESS, 'tokenGive is correct')
          event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
          event.userFill.toString().should.equal(user2, 'userFill is correct')
          event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })
      })

      describe('failure', async () => {
        it('reject invalid order id', async () => {
          const invalidOrderId = 99999; 
          await exchange.fillOrder(invalidOrderId, { from: user2 }).should.be.rejectedWith(EVM_REVERT)
        })

        it('rejects already-filled order', async () => {
          // Fill order
          await exchange.fillOrder(1, { from: user2 }).should.be.fulfilled
          // Try to fill it again
          await exchange.fillOrder(1, { from: user2 }).should.be.rejectedWith(EVM_REVERT)
        })

        it('rejects canceled order', async () => {
          // Canceled order
          await exchange.cancelOrder(1, { from: user1 }).should.be.fulfilled
          // Try to fill it again
          await exchange.fillOrder(1, { from: user2 }).should.be.rejectedWith(EVM_REVERT)
        })
      })

    })

    describe('cancelling orders', async () => {
      let result

      describe('success', async () => {
        beforeEach(async () => {
          result = await exchange.cancelOrder(1, { from: user1 })
        })

        it('updates cancelled orders', async () => {
          const orderCancelled = await exchange.orderCancelled(1)
          orderCancelled.should.equal(true)
        })

        it('emit an cancel event', async () => {
          const log = result.logs[0]
          log.event.should.eq(('Cancel'))
          const event = log.args
          event.id.toString().should.equal('1', 'is is correct')
          event.user.should.equal(user1, 'user is correct')
          event.tokenGet.should.equal(token.address, 'tokenGet is correct')
          event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
          event.tokenGive.should.equal(ETH_ADDRESS, 'tokenGive is correct')
          event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
          event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })
      })

      describe('failure', async () => {
        it('rejects invalid order ids', async () => {
          const invalidOrderId = 99999; 
          await exchange.cancelOrder(invalidOrderId, {from: user1 }).should.be.rejectedWith(EVM_REVERT)
        })

        it('rejects unautholized cancelations', async () => {
          await exchange.cancelOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
        })
        
      })
    })
  })

})