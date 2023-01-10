const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { assert, expect } = require("chai")
describe("FundMe", async function () {
    let fundMe
    let deployer
    let mockV3Aggregator
    const sendValue = ethers.utils.parseEther("1")

    beforeEach(async () => {
        // const accounts = await ethers.getSigners()
        // deployer = accounts[0]
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        )
    })
    describe("constructor", async function () {
        it("Sets the aggregator addresses correctly", async function () {
            const response = await fundMe.s_priceFeed()
            assert.equal(response, mockV3Aggregator.address)
        })
    })
    describe("fund", async function () {
        it("Fails if you dont send enough eth", async function () {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH!"
            )
        })
        it("updated the amount datastructure", async function () {
            fundMe.fund({ value: sendValue })
            const response = await fundMe.s_addressToAmountFunded(deployer)
            assert(response.toString(), sendValue.toString())
        })
        it("Adds funder to s_funders array", async function () {
            fundMe.fund({ value: sendValue })
            const response = await fundMe.s_funders(0)
            assert(response.toString(), deployer.toString())
        })
    })
    describe("withdraw", async function () {
        beforeEach(async function () {
            fundMe.fund({ value: sendValue })
        })
        it("Withdraw ETH from a single founder", async function () {
            //arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            //act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gastCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            //assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                startingDeployerBalance.add(startingFundMeBalance).toString(),
                endingFundMeBalance.add(gastCost).toString()
            )

            it("Allows us to withdraw with multiple s_funders", async function () {
                const accounts = await ethers.getSigners()
                for (let i = 1; i < 6; i++) {
                    const fundMeConnectedContract = await fundMe.connect(
                        accounts[i]
                    )
                    fundMe.withdraw(accounts[i], sendValue)
                }
                await fundMeConnectedContract.fund({ value: sendValue })

                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                const transactionResponse = fundMeConnectedContract.withdraw()
                const transactionReceipt = transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gastCost = gasUsed.mul(effectiveGasPrice)

                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingDeployerBalance
                        .add(startingFundMeBalance)
                        .toString(),
                    endingFundMeBalance.add(gastCost).toString()
                )

                expect(fundMe.s_s_funders(0)).to.be.reverted

                for (let i = 1; i < 6; i++) {
                    assert(
                        await fundMe.s_addressToAmountFunded(
                            accounts[i].address
                        ),
                        0
                    )
                }
            })
            it("only allows owner", async function () {
                const accounts = await ethers.getSigners()
                const attacker = accounts[1]
                const attackerConnectedContract = await fundMe.connect(attacker)
                const transactionResponse = attackerConnectedContract.withdraw()

                await expect(transactionResponse).to.be.revertedWith(
                    "FundMe_NotOwner"
                )
            })
        })
    })
})
