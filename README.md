# EncryptedOracleNode

A privacy-preserving decentralized oracle node for Web3/fhEVM, aggregating encrypted data from multiple sources and providing on-chain encrypted results that can be decrypted on demand. It supports fully encrypted submission, aggregation, and storage, ensuring data confidentiality until decryption is requested.

## Project Background

Centralized oracles often face challenges such as data manipulation, privacy concerns, and lack of trust:

• Data exposure: Sensitive information can be accessed by oracle operators or external parties
• Single source dependency: Results can be biased or manipulated if only one data source is used
• Transparency issues: Users cannot verify the aggregation process
• Limited on-chain privacy: Sensitive data must often be revealed to the chain

EncryptedOracleNode addresses these challenges by providing a blockchain-native, privacy-focused oracle solution:

• Data from multiple sources is encrypted before submission
• Fully Homomorphic Encryption (FHE) allows aggregation without decryption
• Aggregated encrypted results are stored immutably on-chain
• Data can be decrypted only when authorized, preserving confidentiality

## Features

### Core Functionality

• Encrypted Data Submission: Nodes submit encrypted values from various sources
• FHE Aggregation: Supports filtering and aggregation (median, sum, etc.) over encrypted data
• On-Chain Storage: Aggregated encrypted results are stored on-chain
• On-Demand Decryption: Authorized users can decrypt aggregated results as needed
• Multi-Source Support: Aggregates data from different APIs or providers for robustness

### Privacy & Security

• End-to-End Encryption: Data remains encrypted throughout submission, aggregation, and storage
• Immutable Records: Aggregated results stored on-chain cannot be tampered with
• Confidential Aggregation: Aggregation computations are performed without exposing raw data
• Minimal Trust Assumptions: No single party can access full data or manipulate results

## Architecture

### Smart Contracts

EncryptedOracleNode.sol (deployed on fhEVM)

• Manages encrypted data submissions from multiple sources
• Aggregates data on-chain using FHE techniques
• Stores encrypted results immutably
• Provides access for authorized decryption requests

### Node Application

• Node service: Collects, encrypts, and submits data from multiple sources
• FHE Library: Performs secure aggregation and filtering
• API Integration: Fetches data from multiple sources securely
• Real-time Submission: Sends encrypted updates to the blockchain as they arrive

### Frontend Dashboard

• React + TypeScript: Interactive monitoring and visualization
• Data Viewer: Shows encrypted results and decryption status
• Statistics: Aggregated insights without revealing raw values
• Wallet Integration: Optional access for authorized decryption

## Technology Stack

### Blockchain & Smart Contracts

• fhEVM: Fully Homomorphic Encryption-enabled Ethereum-compatible chain
• Solidity ^0.8.24: Smart contract development
• Hardhat: Contract development, testing, and deployment
• Chainlink: Optional integration for external data feeds

### Node & Backend

• FHE Library: Homomorphic encryption computation
• Node.js 18+: Runtime for oracle node
• API Clients: Connectors for multiple data sources

### Frontend

• React 18 + TypeScript: Modern frontend framework
• Tailwind + CSS: Responsive styling
• Ethers.js: Blockchain interactions
• Vercel: Deployment platform

## Installation

### Prerequisites

• Node.js 18+
• npm / yarn / pnpm package manager
• fhEVM wallet (MetaMask, etc.)

### Setup

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to fhEVM network
npx hardhat run deploy/deploy.ts --network fhevm

# Start Node service
cd node
npm install
npm run start

# Start frontend
cd ../frontend
npm install
npm run dev
```

## Usage

• Submit Encrypted Data: Nodes automatically fetch and encrypt data from sources
• Monitor Aggregation: Dashboard shows aggregated results in encrypted form
• Decrypt Results: Authorized users can decrypt aggregated values as needed
• Multi-Source Validation: Ensures robustness and accuracy of aggregated data

## Security Features

• End-to-End Encryption: Data remains confidential throughout the pipeline
• Immutable On-Chain Storage: Aggregated results cannot be modified
• FHE-Based Computation: Aggregation without revealing individual source data
• Access Control: Only authorized parties can decrypt results

## Future Enhancements

• Threshold Decryption: Partial decryption for multiple parties
• Expanded Data Source Support: More APIs and decentralized sources
• Cross-Chain Deployment: Oracle available on multiple chains
• Real-Time Alerting: Notify users when data meets certain conditions
• DAO Governance: Community-managed oracle upgrades

Built with ❤️ for privacy-preserving on-chain oracle services.
