import {ethers,network} from "hardhat"
import { expect } from "chai";
import { abi as usdtAbi } from "../abi/usdt";
import { Contract } from "ethers";

const usdtAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7";

async function getBalanceSlot(erc20:Contract) : Promise<number|undefined>{
    const testAddress = ethers.constants.AddressZero;
    for(let i=0;i<100;i++){
        const snapshot = await network.provider.send("evm_snapshot");
        const checkSlot = ethers.utils.hexStripZeros(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["address","uint256"],[testAddress,i])));
        const value = 3451234;
        const newValue = ethers.utils.defaultAbiCoder.encode(["uint256"],[value]);
        await ethers.provider.send("hardhat_setStorageAt",[erc20.address,checkSlot,newValue]);
        const result = await erc20.balanceOf(testAddress);
        await network.provider.send("evm_revert",[snapshot]);
        if(result == value){     
            return i;
        }
    }
    return undefined;
}

async function getUserBalanceSlot(erc20 : Contract,userAddress:string) : Promise<string>{
    const balanceSlot = await getBalanceSlot(erc20);
    if(!balanceSlot){
        throw Error("No balance Slot in the contract");
    }
    const userBalanceSlot = ethers.utils.hexStripZeros(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["address","uint256"],[userAddress,balanceSlot])));
    return userBalanceSlot;
}

it("Changes the owner address",async function(){
    const [signer] = await ethers.getSigners();
    const usdt = await ethers.getContractAt(usdtAbi,usdtAddress,signer);

    const snapshot = await network.provider.send("evm_snapshot");
    const ownerSlot = "0x0";
    const initialOwner = await usdt.getOwner();
    console.log(initialOwner);
    const signerAddress = signer.address;
    const newValue = ethers.utils.defaultAbiCoder.encode(["address"],[signerAddress]);
    console.log(newValue);
    await ethers.provider.send("hardhat_setStorageAt",[usdt.address,ownerSlot,newValue]);
    expect(await usdt.getOwner()).to.be.eq(signerAddress);
    await network.provider.send("evm_revert",[snapshot]);
})

it("Updates the balance of the user",async function(){
    const [signer] = await ethers.getSigners();
    const usdt = await ethers.getContractAt(usdtAbi,usdtAddress,signer);
    const signerAddress = signer.address;
    const currentBalance = await usdt.balanceOf(signerAddress);
    console.log(currentBalance)
    const slot = await getUserBalanceSlot(usdt,signerAddress);
    const value = 299999993339999;
    const newValue = ethers.utils.defaultAbiCoder.encode(["uint256"],[value]);
    const snapshot = await network.provider.send("evm_snapshot");
    await ethers.provider.send("hardhat_setStorageAt",[usdt.address,slot,newValue]);
    expect(await usdt.balanceOf(signerAddress) == value).to.be.eq(true);
    await network.provider.send("evm_revert",[snapshot]);
    
})