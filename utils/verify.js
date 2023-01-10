const { run } = require("hardhat")

async function verify(contractAddres, args) {
    console.log("Verifying")
    try {
        await run("verify:verify", {
            address: contractAddres,
            constructorAguments: args,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified")
        } else {
            console.log(e)
        }
    }
}

module.exports = { verify }
