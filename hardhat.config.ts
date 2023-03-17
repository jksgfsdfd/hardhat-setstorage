import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import * as dotenv from "dotenv"
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks:{
    hardhat:{
      forking:{
        url:process.env.MAINNET_PROVIDER as string
      }
    }
  }
};

export default config;
