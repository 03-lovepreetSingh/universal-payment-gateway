import hre from "hardhat";
import { Contract } from "ethers";
import * as fs from "fs";
import * as path from "path";

interface DeployedContracts {
  gateway: Contract;
  invoiceRegistry: Contract;
  feeManager: Contract;
  withdrawalVault: Contract;
}

async function main(): Promise<DeployedContracts> {
  console.log("🚀 Starting deployment to Push Chain Donut Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy Gateway contract
  console.log("\n📋 Deploying Gateway contract...");
  const Gateway = await hre.ethers.getContractFactory("Gateway");
  const gateway = await Gateway.deploy();
  await gateway.waitForDeployment();
  const gatewayAddress = await gateway.getAddress();
  console.log("✅ Gateway deployed to:", gatewayAddress);

  // Deploy InvoiceRegistry contract
  console.log("\n📄 Deploying InvoiceRegistry contract...");
  const InvoiceRegistry = await hre.ethers.getContractFactory("InvoiceRegistry");
  const invoiceRegistry = await InvoiceRegistry.deploy();
  await invoiceRegistry.waitForDeployment();
  const invoiceRegistryAddress = await invoiceRegistry.getAddress();
  console.log("✅ InvoiceRegistry deployed to:", invoiceRegistryAddress);

  // Deploy FeeManager contract
  console.log("\n💰 Deploying FeeManager contract...");
  const FeeManager = await hre.ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy();
  await feeManager.waitForDeployment();
  const feeManagerAddress = await feeManager.getAddress();
  console.log("✅ FeeManager deployed to:", feeManagerAddress);

  // Deploy WithdrawalVault contract
  console.log("\n🏦 Deploying WithdrawalVault contract...");
  const WithdrawalVault = await hre.ethers.getContractFactory("WithdrawalVault");
  const withdrawalVault = await WithdrawalVault.deploy();
  await withdrawalVault.waitForDeployment();
  const withdrawalVaultAddress = await withdrawalVault.getAddress();
  console.log("✅ WithdrawalVault deployed to:", withdrawalVaultAddress);

  // Print deployment summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("=".repeat(50));
  console.log("📋 Contract Addresses:");
  console.log("=".repeat(50));
  console.log(`Gateway:          ${gatewayAddress}`);
  console.log(`InvoiceRegistry:  ${invoiceRegistryAddress}`);
  console.log(`FeeManager:       ${feeManagerAddress}`);
  console.log(`WithdrawalVault:  ${withdrawalVaultAddress}`);
  console.log("=".repeat(50));

  // Save addresses to file for frontend use
  const addresses = {
    gateway: gatewayAddress,
    invoiceRegistry: invoiceRegistryAddress,
    feeManager: feeManagerAddress,
    withdrawalVault: withdrawalVaultAddress,
    network: "pushDonutTestnet",
    chainId: 42101,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  // Create contracts directory if it doesn't exist
  const contractsDir = path.join(__dirname, "../src/lib/contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Write addresses to file
  fs.writeFileSync(
    path.join(contractsDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("📁 Contract addresses saved to src/lib/contracts/addresses.json");

  // Verification instructions
  console.log("\n🔍 To verify contracts on Blockscout, run:");
  console.log(`npx hardhat verify --network pushDonutTestnet ${gatewayAddress}`);
  console.log(`npx hardhat verify --network pushDonutTestnet ${invoiceRegistryAddress}`);
  console.log(`npx hardhat verify --network pushDonutTestnet ${feeManagerAddress}`);
  console.log(`npx hardhat verify --network pushDonutTestnet ${withdrawalVaultAddress}`);

  return {
    gateway,
    invoiceRegistry,
    feeManager,
    withdrawalVault,
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });