import { ethers, network } from "hardhat";
import { expect } from "chai";
import { abi as usdtAbi } from "../abi/usdt";
import { abi as erc20Abi } from "../abi/erc20";
import { Contract } from "ethers";

const usdtAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function getBalanceSlot(erc20: Contract): Promise<number | undefined> {
  const testAddress = ethers.constants.AddressZero;
  for (let i = 0; i < 100; i++) {
    const snapshot = await network.provider.send("evm_snapshot");
    const checkSlot = ethers.utils.hexStripZeros(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256"],
          [testAddress, i]
        )
      )
    );
    const value = 3451234;
    const newValue = ethers.utils.defaultAbiCoder.encode(["uint256"], [value]);
    await ethers.provider.send("hardhat_setStorageAt", [
      erc20.address,
      checkSlot,
      newValue,
    ]);
    const result = await erc20.balanceOf(testAddress);
    await network.provider.send("evm_revert", [snapshot]);
    if (result == value) {
      return i;
    }
  }
  return undefined;
}

async function getUserBalanceSlot(
  erc20: Contract,
  userAddress: string
): Promise<string> {
  const balanceSlot = await getBalanceSlot(erc20);
  if (!balanceSlot) {
    throw Error("No balance Slot in the contract");
  }
  const userBalanceSlot = ethers.utils.hexStripZeros(
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [userAddress, balanceSlot]
      )
    )
  );
  return userBalanceSlot;
}

it("Changes the owner address", async function () {
  const [signer] = await ethers.getSigners();
  const usdt = await ethers.getContractAt(usdtAbi, usdtAddress, signer);

  const snapshot = await network.provider.send("evm_snapshot");
  const ownerSlot = "0x0";
  const signerAddress = signer.address;
  const newValue = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [signerAddress]
  );
  await ethers.provider.send("hardhat_setStorageAt", [
    usdt.address,
    ownerSlot,
    newValue,
  ]);
  expect(await usdt.getOwner()).to.be.eq(signerAddress);
  await network.provider.send("evm_revert", [snapshot]);
});

it("Gets the balance of the user correctly with known balance slot", async function () {
  const weth = await ethers.getContractAt(erc20Abi, wethAddress);

  // for weth contract the balanceOf mapping is the 4th variable and there is no packing before
  const checkAddress = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";
  const balanceSlot = 3;
  const checkerBalanceSlot = ethers.utils.hexStripZeros(
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [checkAddress, balanceSlot]
      )
    )
  );
  // verifying that balance slot is actually 3

  const balanceFunctionCall = await weth.balanceOf(checkAddress);
  const balanceGetStorageCall = await ethers.provider.send("eth_getStorageAt", [
    wethAddress,
    checkerBalanceSlot,
  ]);
  expect(balanceFunctionCall.eq(balanceGetStorageCall)).to.be.eq(true);
});

it("Sets the balance of the user correctly with known balance slot", async function () {
  const weth = await ethers.getContractAt(erc20Abi, wethAddress);
  const checkAddress = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";
  // for weth contract the balanceOf mapping is the 4th variable and there is no packing before
  const balanceSlot = 3;
  const checkerBalanceSlot = ethers.utils.hexStripZeros(
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [checkAddress, balanceSlot]
      )
    )
  );
  // verifying that balance slot is actually 3
  const value = ethers.utils.parseEther("1");
  const setValue = ethers.utils.defaultAbiCoder.encode(["uint256"], [value]);
  await ethers.provider.send("hardhat_setStorageAt", [
    wethAddress,
    checkerBalanceSlot,
    setValue,
  ]);
  const balanceFunctionCall = await weth.balanceOf(checkAddress);
  expect(balanceFunctionCall.eq(value)).to.be.eq(true);
});

it("Updates the balance of the user correctly with bruteforce method", async function () {
  const [signer] = await ethers.getSigners();
  const usdt = await ethers.getContractAt(usdtAbi, usdtAddress, signer);
  const signerAddress = signer.address;
  const currentBalance = await usdt.balanceOf(signerAddress);
  const slot = await getUserBalanceSlot(usdt, signerAddress);
  const value = 299999993339999;
  const newValue = ethers.utils.defaultAbiCoder.encode(["uint256"], [value]);
  const snapshot = await network.provider.send("evm_snapshot");
  await ethers.provider.send("hardhat_setStorageAt", [
    usdt.address,
    slot,
    newValue,
  ]);
  expect((await usdt.balanceOf(signerAddress)) == value).to.be.eq(true);
  await network.provider.send("evm_revert", [snapshot]);
});
