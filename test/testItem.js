//import expectThrow from 'openzeppelin-solidity/test/helpers/expectThrow';
const Item = artifacts.require("Item");

const ExpectThrow = async (promise) => {
      try {
        await promise;
      } catch (error) {
        const invalidJump = error.message.search('invalid JUMP') >= 0;
        const outOfGas = error.message.search('out of gas') >= 0;
        const revert = error.message.search('revert') >= 0;
        assert(
          invalidJump || outOfGas || revert,
          "Expected throw, got '" + error + "' instead",
        );
        return;
      }
      assert.fail(0, 1, 'Expected throw not received');
}

contract('Item Tests', async (accounts) => {

    it("should have 0 item count on deploy.", async () => {
       let instance = await Item.deployed();
       let itemCount = await instance.getItemCount();
       assert.equal(itemCount.valueOf(), 0, "Initial item count incorrect.");
    })

    it("get non-existing item should throw.", async () => {
      let instance = await Item.deployed();
      ExpectThrow(instance.getItem(99));
    })

    it("should complete whole item/answer process", async () => {

      let bounty_amount = web3.toWei(1, 'ether');
      let itemHash = "Item Number One";

      let instance = await Item.deployed();

      let account_one_starting_balance = await web3.eth.getBalance(accounts[0]);

      let hash = await instance.makeItem.sendTransaction(itemHash, {value: bounty_amount, from: accounts[0]});            // Creates Item

      const tx = await web3.eth.getTransaction(hash);
      const receipt = await web3.eth.getTransactionReceipt(hash);                                                           // Calculates used Gas for Create Item
      const gasCost = tx.gasPrice.mul(receipt.gasUsed);

      let account_one_ending_balance = await web3.eth.getBalance(accounts[0]);
      account_one_ending_balance_check = account_one_starting_balance.minus(gasCost);
      account_one_ending_balance_check = account_one_ending_balance_check.minus(bounty_amount);                           // This is all deductions

      assert.equal(account_one_ending_balance.toNumber(), account_one_ending_balance_check.toNumber(), "Bounty amount for make item wasn't correctly taken from the creator");

      hash = await instance.getItemCount.call();
      assert.equal(1, hash.toNumber(), "Should be 1 item created.");

      hash = await instance.getItemAnswerCount.call(1);
      assert.equal(0, hash.toNumber(), "Should be 0 answers created for item.");

      ExpectThrow(instance.acceptAnswer.sendTransaction(1, 0, {from: accounts[0]}));            // Should throw when no answers

      hash = await instance.addAnswer.sendTransaction(1, "Answer No 1", {from: accounts[1]});
      hash = await instance.addAnswer.sendTransaction(1, "Answer No 2", {from: accounts[2]});

      hash = await instance.getItemAnswerCount.call(1);
      assert.equal(2, hash.toNumber(), "Should be 2 answers created for item.");

      let account_two_starting_balance = await web3.eth.getBalance(accounts[2]);

      ExpectThrow(instance.acceptAnswer.sendTransaction(1, 2, {from: accounts[1]}));

      hash = await instance.acceptAnswer.sendTransaction(1, 2, {from: accounts[0]});

      hash = await instance.getItem.call(1, {from: accounts[0]});
      let specificationHash = web3.toAscii(hash[0]).replace(/\0/g, '');
      let owner = hash[1];
      let deliverableHash = hash[2]; // UNUSED
      let bounty = hash[3].toNumber();
      let answerCount = hash[4].toNumber();
      let finalised = hash[5];
      let cancelled = hash[6];
      let acceptedAnswerHash = web3.toAscii(hash[7]).replace(/\0/g, '');

      assert.equal(specificationHash, itemHash, "Item hash wasn't same.");
      assert.equal(owner, accounts[0], "Item owner not correct.");
      assert.equal(bounty, bounty_amount, "Item Bounty not correct.");
      assert.equal(answerCount, 2, "Should be 2 answers.");
      assert.equal(finalised, true, "Item should be finalised.");
      assert.equal(cancelled, false, "Item should not be cancelled.");
      assert.equal(acceptedAnswerHash, "Answer No 2", "Accepted answer 2 should be accepted.");

      let account_two_ending_balance = await web3.eth.getBalance(accounts[2]);

      assert.equal(account_two_ending_balance.toNumber(), account_two_starting_balance.plus(bounty_amount).toNumber(), "Amount wasn't correctly sent to correct answer owner.");

      ExpectThrow(instance.acceptAnswer.sendTransaction(1, 2, {from: accounts[0]}));
    });

    it("show throw when cancel called on non-item", async () => {
      let instance = await Item.deployed();
      ExpectThrow(instance.cancelItem.sendTransaction(99, {from: accounts[0]}));
    })

    it("should throw when cancel on finalised item", async () => {
      let instance = await Item.deployed();
      ExpectThrow(instance.cancelItem.sendTransaction(1, {from: accounts[0]}));
    })

    it("should cancel item and refund bounty", async () => {

      let bounty_amount = web3.toWei(1, 'ether');
      let itemHash = "Item Number One";

      let instance = await Item.deployed();

      let account_one_starting_balance = await web3.eth.getBalance(accounts[0]);

      let hash = await instance.makeItem.sendTransaction(itemHash, {value: bounty_amount, from: accounts[0]});            // Creates Item

      let tx = await web3.eth.getTransaction(hash);
      let receipt = await web3.eth.getTransactionReceipt(hash);                                                           // Calculates used Gas for Create Item
      let gasCost = tx.gasPrice.mul(receipt.gasUsed);

      let account_one_ending_balance = await web3.eth.getBalance(accounts[0]);
      account_one_ending_balance_check = account_one_starting_balance.minus(gasCost);
      account_one_ending_balance_check = account_one_ending_balance_check.minus(bounty_amount);                           // This is all deductions

      assert.equal(account_one_ending_balance.toNumber(), account_one_ending_balance_check.toNumber(), "Bounty amount for make item wasn't correctly taken from the creator");

      ExpectThrow(instance.cancelItem.sendTransaction(2, {from: accounts[1]}));                                       // Confirm only owner can cancel item

      hash = await instance.cancelItem.sendTransaction(2, {from: accounts[0]});

      tx = await web3.eth.getTransaction(hash);
      receipt = await web3.eth.getTransactionReceipt(hash);                                                           // Calculates used Gas for Create Item
      gasCost = tx.gasPrice.mul(receipt.gasUsed);

      account_one_ending_balance_check = account_one_ending_balance.minus(gasCost);
      account_one_ending_balance_check = account_one_ending_balance_check.plus(bounty_amount);

      account_one_ending_balance = await web3.eth.getBalance(accounts[0]);

      assert.equal(account_one_ending_balance.toNumber(), account_one_ending_balance_check.toNumber(), "Bounty wasn't refunded to owner.");

      hash = await instance.getItem.call(2, {from: accounts[0]});
      let specificationHash = web3.toAscii(hash[0]).replace(/\0/g, '');
      let owner = hash[1];
      let deliverableHash = hash[2]; // UNUSED
      let bounty = hash[3].toNumber();
      let answerCount = hash[4].toNumber();
      let finalised = hash[5];
      let cancelled = hash[6];
      let acceptedAnswerHash = web3.toAscii(hash[7]).replace(/\0/g, '');

      assert.equal(specificationHash, itemHash, "Item hash wasn't same.");
      assert.equal(owner, accounts[0], "Item owner not correct.");
      assert.equal(bounty, bounty_amount, "Item Bounty not correct.");
      assert.equal(answerCount, 0, "Should be 0 answers.");
      assert.equal(finalised, false, "Item should not be finalised.");
      assert.equal(cancelled, true, "Item should be cancelled.");
    });

    it("should throw when accept called on cancelled item", async () => {
      let instance = await Item.deployed();
      ExpectThrow(instance.acceptAnswer.sendTransaction(2, 1, {from: accounts[0]}));
    })
})