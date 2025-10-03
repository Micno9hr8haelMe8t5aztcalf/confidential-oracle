// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract EncryptedOracleFHE is SepoliaConfig {
    struct EncryptedDataPoint {
        uint256 id;
        euint32 encryptedValue;
        uint256 timestamp;
    }

    struct DecryptedDataPoint {
        uint32 value;
        bool isRevealed;
    }

    uint256 public dataCount;
    mapping(uint256 => EncryptedDataPoint) public encryptedData;
    mapping(uint256 => DecryptedDataPoint) public decryptedData;

    mapping(uint256 => uint256) private requestToDataId;

    event DataSubmitted(uint256 indexed id, uint256 timestamp);
    event DecryptionRequested(uint256 indexed id);
    event DataDecrypted(uint256 indexed id);

    modifier onlySource(uint256 dataId) {
        _; // Access control placeholder
    }

    /// @notice Submit encrypted data from oracle
    function submitEncryptedData(euint32 encryptedValue) public {
        dataCount += 1;
        uint256 newId = dataCount;

        encryptedData[newId] = EncryptedDataPoint({
            id: newId,
            encryptedValue: encryptedValue,
            timestamp: block.timestamp
        });

        decryptedData[newId] = DecryptedDataPoint({
            value: 0,
            isRevealed: false
        });

        emit DataSubmitted(newId, block.timestamp);
    }

    /// @notice Request decryption of aggregated data
    function requestDataDecryption(uint256 dataId) public onlySource(dataId) {
        EncryptedDataPoint storage dataPoint = encryptedData[dataId];
        require(!decryptedData[dataId].isRevealed, "Already decrypted");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(dataPoint.encryptedValue);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptDataPoint.selector);
        requestToDataId[reqId] = dataId;

        emit DecryptionRequested(dataId);
    }

    /// @notice Callback for decrypted data
    function decryptDataPoint(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 dataId = requestToDataId[requestId];
        require(dataId != 0, "Invalid request");

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint32 value = abi.decode(cleartexts, (uint32));
        decryptedData[dataId].value = value;
        decryptedData[dataId].isRevealed = true;

        emit DataDecrypted(dataId);
    }

    /// @notice Get decrypted data
    function getDecryptedData(uint256 dataId) public view returns (uint32 value, bool isRevealed) {
        DecryptedDataPoint storage dp = decryptedData[dataId];
        return (dp.value, dp.isRevealed);
    }
}
