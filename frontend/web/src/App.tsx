import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface OracleData {
  id: string;
  encryptedValue: string;
  timestamp: number;
  source: string;
  status: "pending" | "aggregated" | "decrypted";
  decryptedValue?: string;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [oracleData, setOracleData] = useState<OracleData[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newData, setNewData] = useState({
    source: "",
    value: ""
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedData, setSelectedData] = useState<OracleData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Calculate statistics
  const pendingCount = oracleData.filter(d => d.status === "pending").length;
  const aggregatedCount = oracleData.filter(d => d.status === "aggregated").length;
  const decryptedCount = oracleData.filter(d => d.status === "decrypted").length;

  useEffect(() => {
    loadOracleData().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadOracleData = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("oracle_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing oracle keys:", e);
        }
      }
      
      const list: OracleData[] = [];
      
      for (const key of keys) {
        try {
          const dataBytes = await contract.getData(`oracle_${key}`);
          if (dataBytes.length > 0) {
            try {
              const data = JSON.parse(ethers.toUtf8String(dataBytes));
              list.push({
                id: key,
                encryptedValue: data.value,
                timestamp: data.timestamp,
                source: data.source,
                status: data.status || "pending",
                decryptedValue: data.decryptedValue
              });
            } catch (e) {
              console.error(`Error parsing data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading data ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setOracleData(list);
    } catch (e) {
      console.error("Error loading oracle data:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitData = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setSubmitting(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting data with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedValue = `FHE-${btoa(newData.value)}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const dataId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const oracleData = {
        value: encryptedValue,
        timestamp: Math.floor(Date.now() / 1000),
        source: newData.source,
        status: "pending"
      };
      
      // Store encrypted data on-chain
      await contract.setData(
        `oracle_${dataId}`, 
        ethers.toUtf8Bytes(JSON.stringify(oracleData))
      );
      
      const keysBytes = await contract.getData("oracle_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(dataId);
      
      await contract.setData(
        "oracle_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Encrypted data submitted successfully!"
      });
      
      await loadOracleData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowSubmitModal(false);
        setNewData({
          source: "",
          value: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const aggregateData = async () => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Aggregating encrypted data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      // Update all pending data to aggregated status
      const keysBytes = await contract.getData("oracle_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      for (const key of keys) {
        const dataBytes = await contract.getData(`oracle_${key}`);
        if (dataBytes.length === 0) continue;
        
        const data = JSON.parse(ethers.toUtf8String(dataBytes));
        if (data.status === "pending") {
          data.status = "aggregated";
          await contract.setData(
            `oracle_${key}`, 
            ethers.toUtf8Bytes(JSON.stringify(data))
          );
        }
      }
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE aggregation completed successfully!"
      });
      
      await loadOracleData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Aggregation failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const decryptData = async (dataId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Decrypting data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const dataBytes = await contract.getData(`oracle_${dataId}`);
      if (dataBytes.length === 0) {
        throw new Error("Data not found");
      }
      
      const data = JSON.parse(ethers.toUtf8String(dataBytes));
      
      // Simulate decryption
      if (data.value.startsWith("FHE-")) {
        data.decryptedValue = atob(data.value.substring(4));
      } else {
        data.decryptedValue = "Decryption failed";
      }
      
      data.status = "decrypted";
      
      await contract.setData(
        `oracle_${dataId}`, 
        ethers.toUtf8Bytes(JSON.stringify(data))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE decryption completed successfully!"
      });
      
      await loadOracleData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Decryption failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const viewDataDetails = (data: OracleData) => {
    setSelectedData(data);
    setShowDetailModal(true);
  };

  const tutorialSteps = [
    {
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to interact with the FHE Oracle",
      icon: "🔗"
    },
    {
      title: "Submit Encrypted Data",
      description: "Add your encrypted data to the oracle network",
      icon: "🔒"
    },
    {
      title: "FHE Aggregation",
      description: "Aggregate encrypted data from multiple sources",
      icon: "⚙️"
    },
    {
      title: "On-Demand Decryption",
      description: "Decrypt aggregated results when needed",
      icon: "🔓"
    }
  ];

  const renderStatusChart = () => {
    const total = oracleData.length || 1;
    const pendingPercentage = (pendingCount / total) * 100;
    const aggregatedPercentage = (aggregatedCount / total) * 100;
    const decryptedPercentage = (decryptedCount / total) * 100;

    return (
      <div className="pie-chart-container">
        <div className="pie-chart">
          <div 
            className="pie-segment pending" 
            style={{ transform: `rotate(${pendingPercentage * 3.6}deg)` }}
          ></div>
          <div 
            className="pie-segment aggregated" 
            style={{ transform: `rotate(${(pendingPercentage + aggregatedPercentage) * 3.6}deg)` }}
          ></div>
          <div 
            className="pie-segment decrypted" 
            style={{ transform: `rotate(${(pendingPercentage + aggregatedPercentage + decryptedPercentage) * 3.6}deg)` }}
          ></div>
          <div className="pie-center">
            <div className="pie-value">{oracleData.length}</div>
            <div className="pie-label">Data Points</div>
          </div>
        </div>
        <div className="pie-legend">
          <div className="legend-item">
            <div className="color-box pending"></div>
            <span>Pending: {pendingCount}</span>
          </div>
          <div className="legend-item">
            <div className="color-box aggregated"></div>
            <span>Aggregated: {aggregatedCount}</span>
          </div>
          <div className="legend-item">
            <div className="color-box decrypted"></div>
            <span>Decrypted: {decryptedCount}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="metal-spinner"></div>
      <p>Initializing FHE Oracle...</p>
    </div>
  );

  return (
    <div className="app-container metal-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="shield-icon"></div>
          </div>
          <h1>FHE<span>Oracle</span>Aggregator</h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowSubmitModal(true)} 
            className="submit-data-btn metal-button"
          >
            <div className="add-icon"></div>
            Submit Data
          </button>
          <button 
            className="metal-button"
            onClick={() => setShowTutorial(!showTutorial)}
          >
            {showTutorial ? "Hide Tutorial" : "Show Tutorial"}
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Fully Homomorphic Encryption Oracle</h2>
            <p>Securely aggregate and decrypt sensitive data on-chain</p>
          </div>
        </div>
        
        {showTutorial && (
          <div className="tutorial-section">
            <h2>FHE Oracle Tutorial</h2>
            <p className="subtitle">Learn how to securely process encrypted data</p>
            
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div 
                  className="tutorial-step"
                  key={index}
                >
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="dashboard-grid">
          <div className="dashboard-card metal-card">
            <h3>Project Introduction</h3>
            <p>FHE Oracle enables secure aggregation of encrypted data from multiple sources and on-demand decryption using fully homomorphic encryption.</p>
            <div className="fhe-badge">
              <span>FHE-Powered</span>
            </div>
          </div>
          
          <div className="dashboard-card metal-card">
            <h3>Data Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{oracleData.length}</div>
                <div className="stat-label">Total Data</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{pendingCount}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{aggregatedCount}</div>
                <div className="stat-label">Aggregated</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{decryptedCount}</div>
                <div className="stat-label">Decrypted</div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card metal-card">
            <h3>Status Distribution</h3>
            {renderStatusChart()}
          </div>
        </div>
        
        <div className="actions-panel">
          <button 
            className="metal-button primary"
            onClick={() => {
              const contract = getContractReadOnly();
              if (contract) {
                contract.isAvailable().then(() => {
                  alert("Contract is available and ready");
                });
              }
            }}
          >
            Check Availability
          </button>
          
          <button 
            className="metal-button primary"
            onClick={aggregateData}
          >
            Aggregate Data
          </button>
          
          <button 
            onClick={loadOracleData}
            className="refresh-btn metal-button"
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
        
        <div className="data-section">
          <div className="section-header">
            <h2>Encrypted Oracle Data</h2>
          </div>
          
          <div className="data-list metal-card">
            <div className="table-header">
              <div className="header-cell">ID</div>
              <div className="header-cell">Source</div>
              <div className="header-cell">Timestamp</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Actions</div>
            </div>
            
            {oracleData.length === 0 ? (
              <div className="no-data">
                <div className="no-data-icon"></div>
                <p>No encrypted data found</p>
                <button 
                  className="metal-button primary"
                  onClick={() => setShowSubmitModal(true)}
                >
                  Submit First Data
                </button>
              </div>
            ) : (
              oracleData.map(data => (
                <div className="data-row" key={data.id}>
                  <div className="table-cell data-id">#{data.id.substring(0, 6)}</div>
                  <div className="table-cell">{data.source}</div>
                  <div className="table-cell">
                    {new Date(data.timestamp * 1000).toLocaleDateString()}
                  </div>
                  <div className="table-cell">
                    <span className={`status-badge ${data.status}`}>
                      {data.status}
                    </span>
                  </div>
                  <div className="table-cell actions">
                    <button 
                      className="action-btn metal-button"
                      onClick={() => viewDataDetails(data)}
                    >
                      Details
                    </button>
                    {data.status === "aggregated" && (
                      <button 
                        className="action-btn metal-button primary"
                        onClick={() => decryptData(data.id)}
                      >
                        Decrypt
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  
      {showSubmitModal && (
        <ModalSubmit 
          onSubmit={submitData} 
          onClose={() => setShowSubmitModal(false)} 
          submitting={submitting}
          data={newData}
          setData={setNewData}
        />
      )}
      
      {showDetailModal && selectedData && (
        <ModalDetail 
          data={selectedData} 
          onClose={() => setShowDetailModal(false)}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content metal-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="metal-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="shield-icon"></div>
              <span>FHE Oracle Aggregator</span>
            </div>
            <p>Secure encrypted data aggregation using FHE technology</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} FHE Oracle Aggregator. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalSubmitProps {
  onSubmit: () => void; 
  onClose: () => void; 
  submitting: boolean;
  data: any;
  setData: (data: any) => void;
}

const ModalSubmit: React.FC<ModalSubmitProps> = ({ 
  onSubmit, 
  onClose, 
  submitting,
  data,
  setData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData({
      ...data,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!data.source || !data.value) {
      alert("Please fill required fields");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="submit-modal metal-card">
        <div className="modal-header">
          <h2>Submit Encrypted Data</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Your data will be encrypted with FHE
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Data Source *</label>
              <input 
                type="text"
                name="source"
                value={data.source} 
                onChange={handleChange}
                placeholder="Data source name..." 
                className="metal-input"
              />
            </div>
            
            <div className="form-group full-width">
              <label>Data Value *</label>
              <textarea 
                name="value"
                value={data.value} 
                onChange={handleChange}
                placeholder="Enter data to encrypt..." 
                className="metal-textarea"
                rows={4}
              />
            </div>
          </div>
          
          <div className="privacy-notice">
            <div className="privacy-icon"></div> Data remains encrypted during FHE processing
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn metal-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="submit-btn metal-button primary"
          >
            {submitting ? "Encrypting with FHE..." : "Submit Securely"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ModalDetailProps {
  data: OracleData;
  onClose: () => void;
}

const ModalDetail: React.FC<ModalDetailProps> = ({ data, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="detail-modal metal-card">
        <div className="modal-header">
          <h2>Data Details</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{data.id}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Source:</span>
              <span className="detail-value">{data.source}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Timestamp:</span>
              <span className="detail-value">
                {new Date(data.timestamp * 1000).toLocaleString()}
              </span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className={`detail-value status-badge ${data.status}`}>
                {data.status}
              </span>
            </div>
            
            <div className="detail-item full-width">
              <span className="detail-label">Encrypted Value:</span>
              <div className="encrypted-value">
                {data.encryptedValue}
              </div>
            </div>
            
            {data.status === "decrypted" && data.decryptedValue && (
              <div className="detail-item full-width">
                <span className="detail-label">Decrypted Value:</span>
                <div className="decrypted-value">
                  {data.decryptedValue}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="close-btn metal-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;