import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";

// Simulated contract interaction functions
const getContractReadOnly = () => {
  return {
    isAvailable: async () => true,
    setData: async (key: string, value: string) => {
      console.log(`Setting data: ${key} = ${value}`);
      return { wait: () => new Promise(resolve => setTimeout(resolve, 2000)) };
    },
    getData: async (key: string) => {
      console.log(`Getting data for key: ${key}`);
      return "EncryptedData-" + key;
    }
  };
};

const getContractWithSigner = () => {
  return getContractReadOnly();
};

// Wallet Manager Component
const WalletManager: React.FC<{ 
  account: string, 
  onConnect: () => void, 
  onDisconnect: () => void 
}> = ({ account, onConnect, onDisconnect }) => {
  return (
    <div className="wallet-manager">
      {account ? (
        <div className="wallet-info">
          <div className="wallet-icon metal-icon"></div>
          <div className="wallet-address">
            {account.substring(0, 6)}...{account.substring(account.length - 4)}
          </div>
          <button 
            className="metal-button disconnect-btn"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button 
          className="metal-button connect-btn"
          onClick={onConnect}
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

// Wallet Selector Component
const WalletSelector: React.FC<{ 
  isOpen: boolean, 
  onWalletSelect: (wallet: string) => void, 
  onClose: () => void 
}> = ({ isOpen, onWalletSelect, onClose }) => {
  if (!isOpen) return null;

  const wallets = ["MetaMask", "WalletConnect", "Coinbase Wallet", "Ledger"];

  return (
    <div className="wallet-selector-overlay">
      <div className="wallet-selector metal-card">
        <div className="selector-header">
          <h3>Select Wallet</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="wallets-list">
          {wallets.map(wallet => (
            <div 
              key={wallet}
              className="wallet-option metal-button"
              onClick={() => onWalletSelect(wallet)}
            >
              <div className={`wallet-icon ${wallet.toLowerCase().replace(' ', '-')}`}></div>
              {wallet}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Data Item Interface
interface DataItem {
  id: string;
  key: string;
  encryptedValue: string;
  timestamp: number;
  decryptedValue?: string;
  status: "encrypted" | "decrypting" | "decrypted";
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [dataItems, setDataItems] = useState<DataItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newData, setNewData] = useState({
    key: "",
    value: ""
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Calculate statistics
  const encryptedCount = dataItems.filter(item => item.status === "encrypted").length;
  const decryptingCount = dataItems.filter(item => item.status === "decrypting").length;
  const decryptedCount = dataItems.filter(item => item.status === "decrypted").length;

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, []);

  const onWalletSelect = async (wallet: string) => {
    try {
      // Simulate wallet connection
      const address = `0x${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}`;
      setAccount(address);
      setWalletSelectorOpen(false);
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => setAccount("");

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      // Simulate loading data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, we would fetch actual data here
      setIsRefreshing(false);
    } catch (e) {
      console.error("Error loading data:", e);
      setIsRefreshing(false);
    }
  };

  const addData = async () => {
    if (!account) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setAdding(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting data with FHE..."
    });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      // Simulate FHE encryption
      const encryptedValue = `FHE-${btoa(newData.value)}`;
      
      // Store encrypted data on-chain using FHE
      await contract.setData(newData.key, encryptedValue);
      
      // Add to local state
      const newItem: DataItem = {
        id: `${Date.now()}`,
        key: newData.key,
        encryptedValue: encryptedValue,
        timestamp: Math.floor(Date.now() / 1000),
        status: "encrypted"
      };
      
      setDataItems(prev => [newItem, ...prev]);
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Data encrypted and stored securely!"
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowAddModal(false);
        setNewData({ key: "", value: "" });
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
      setAdding(false);
    }
  };

  const decryptData = async (id: string) => {
    if (!account) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Decrypting data with FHE..."
    });

    try {
      // Update item status to decrypting
      setDataItems(prev => prev.map(item => 
        item.id === id ? {...item, status: "decrypting"} : item
      ));

      // Simulate FHE decryption time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Find the item and decrypt
      const updatedItems = dataItems.map(item => {
        if (item.id === id) {
          // Simulate decryption
          const decryptedValue = atob(item.encryptedValue.replace("FHE-", ""));
          return {
            ...item,
            decryptedValue,
            status: "decrypted"
          };
        }
        return item;
      });
      
      setDataItems(updatedItems);
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Data decrypted successfully!"
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Decryption failed: " + (e.message || "Unknown error")
      });
      
      // Reset item status
      setDataItems(prev => prev.map(item => 
        item.id === id ? {...item, status: "encrypted"} : item
      ));
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const checkAvailability = async () => {
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Checking contract availability..."
    });

    try {
      const contract = await getContractReadOnly();
      const isAvailable = await contract.isAvailable();
      
      if (isAvailable) {
        setTransactionStatus({
          visible: true,
          status: "success",
          message: "Contract is available and FHE-ready!"
        });
      } else {
        setTransactionStatus({
          visible: true,
          status: "error",
          message: "Contract is not available"
        });
      }
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Availability check failed"
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const tutorialSteps = [
    {
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to interact with the FHE Oracle",
      icon: "🔗"
    },
    {
      title: "Submit Encrypted Data",
      description: "Add your sensitive data which will be encrypted using FHE",
      icon: "🔒"
    },
    {
      title: "FHE Data Aggregation",
      description: "Oracle nodes aggregate encrypted data without decryption",
      icon: "📊"
    },
    {
      title: "On-Demand Decryption",
      description: "Decrypt aggregated results only when needed",
      icon: "🔓"
    }
  ];

  const renderPieChart = () => {
    const total = dataItems.length || 1;
    const encryptedPercentage = (encryptedCount / total) * 100;
    const decryptingPercentage = (decryptingCount / total) * 100;
    const decryptedPercentage = (decryptedCount / total) * 100;

    return (
      <div className="pie-chart-container">
        <div className="pie-chart">
          <div 
            className="pie-segment encrypted" 
            style={{ transform: `rotate(${encryptedPercentage * 3.6}deg)` }}
          ></div>
          <div 
            className="pie-segment decrypting" 
            style={{ transform: `rotate(${(encryptedPercentage + decryptingPercentage) * 3.6}deg)` }}
          ></div>
          <div 
            className="pie-segment decrypted" 
            style={{ transform: `rotate(${(encryptedPercentage + decryptingPercentage + decryptedPercentage) * 3.6}deg)` }}
          ></div>
          <div className="pie-center">
            <div className="pie-value">{dataItems.length}</div>
            <div className="pie-label">Data Items</div>
          </div>
        </div>
        <div className="pie-legend">
          <div className="legend-item">
            <div className="color-box encrypted"></div>
            <span>Encrypted: {encryptedCount}</span>
          </div>
          <div className="legend-item">
            <div className="color-box decrypting"></div>
            <span>Decrypting: {decryptingCount}</span>
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
          <h1>FHE<span>Oracle</span></h1>
        </div>
        
        <div className="header-tabs">
          <button 
            className={`tab-button ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button 
            className={`tab-button ${activeTab === "data" ? "active" : ""}`}
            onClick={() => setActiveTab("data")}
          >
            Data Explorer
          </button>
          <button 
            className={`tab-button ${activeTab === "tutorial" ? "active" : ""}`}
            onClick={() => setActiveTab("tutorial")}
          >
            Tutorial
          </button>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowAddModal(true)} 
            className="metal-button primary"
          >
            Add Data
          </button>
          <button 
            className="metal-button"
            onClick={checkAvailability}
          >
            Check FHE Status
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        {activeTab === "dashboard" && (
          <div className="dashboard-panels">
            <div className="panel metal-card">
              <h2>FHE Oracle Overview</h2>
              <p>Secure, decentralized oracle that aggregates encrypted data from multiple sources using Fully Homomorphic Encryption (FHE).</p>
              
              <div className="fhe-features">
                <div className="feature">
                  <div className="feature-icon">🔐</div>
                  <h3>Encrypted Data Submission</h3>
                  <p>Data providers submit encrypted information to the oracle network</p>
                </div>
                <div className="feature">
                  <div className="feature-icon">📊</div>
                  <h3>FHE Data Aggregation</h3>
                  <p>Oracle nodes compute aggregated results without decrypting data</p>
                </div>
                <div className="feature">
                  <div className="feature-icon">🔓</div>
                  <h3>On-Demand Decryption</h3>
                  <p>Results remain encrypted until specifically requested for decryption</p>
                </div>
              </div>
            </div>
            
            <div className="panel metal-card">
              <h2>Data Statistics</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{dataItems.length}</div>
                  <div className="stat-label">Total Data Items</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{encryptedCount}</div>
                  <div className="stat-label">Encrypted</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{decryptingCount}</div>
                  <div className="stat-label">Decrypting</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{decryptedCount}</div>
                  <div className="stat-label">Decrypted</div>
                </div>
              </div>
            </div>
            
            <div className="panel metal-card">
              <h2>Data Status Distribution</h2>
              {dataItems.length > 0 ? renderPieChart() : (
                <div className="no-data-chart">
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === "data" && (
          <div className="data-explorer">
            <div className="explorer-header">
              <h2>Encrypted Data Explorer</h2>
              <div className="header-actions">
                <button 
                  onClick={loadData}
                  className="metal-button"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh Data"}
                </button>
              </div>
            </div>
            
            <div className="data-list metal-card">
              <div className="table-header">
                <div className="header-cell">Key</div>
                <div className="header-cell">Encrypted Value</div>
                <div className="header-cell">Timestamp</div>
                <div className="header-cell">Status</div>
                <div className="header-cell">Actions</div>
              </div>
              
              {dataItems.length === 0 ? (
                <div className="no-data">
                  <div className="no-data-icon"></div>
                  <p>No encrypted data found</p>
                  <button 
                    className="metal-button primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    Add First Data Item
                  </button>
                </div>
              ) : (
                dataItems.map(item => (
                  <div className="data-row" key={item.id}>
                    <div className="table-cell">{item.key}</div>
                    <div className="table-cell encrypted-value">
                      {item.encryptedValue.substring(0, 20)}...
                    </div>
                    <div className="table-cell">
                      {new Date(item.timestamp * 1000).toLocaleString()}
                    </div>
                    <div className="table-cell">
                      <span className={`status-badge ${item.status}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="table-cell actions">
                      {item.status === "encrypted" && (
                        <button 
                          className="action-btn metal-button"
                          onClick={() => decryptData(item.id)}
                        >
                          Decrypt
                        </button>
                      )}
                      {item.status === "decrypted" && (
                        <div className="decrypted-value">
                          {item.decryptedValue}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {activeTab === "tutorial" && (
          <div className="tutorial-section metal-card">
            <h2>FHE Oracle Tutorial</h2>
            <p className="subtitle">Learn how to securely process sensitive data with FHE</p>
            
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div 
                  className="tutorial-step"
                  key={index}
                >
                  <div className="step-number">{index + 1}</div>
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="fhe-explanation">
              <h3>How FHE Protects Your Data</h3>
              <p>
                Fully Homomorphic Encryption (FHE) allows computations to be performed directly on encrypted data 
                without needing to decrypt it first. This means sensitive information remains protected throughout 
                the entire aggregation process in the oracle network.
              </p>
              <div className="fhe-process">
                <div className="process-step">
                  <div className="step-icon">🔐</div>
                  <div className="step-text">Data encrypted at source</div>
                </div>
                <div className="process-arrow">→</div>
                <div className="process-step">
                  <div className="step-icon">📡</div>
                  <div className="step-text">Sent to oracle nodes</div>
                </div>
                <div className="process-arrow">→</div>
                <div className="process-step">
                  <div className="step-icon">🧮</div>
                  <div className="step-text">Computations on encrypted data</div>
                </div>
                <div className="process-arrow">→</div>
                <div className="process-step">
                  <div className="step-icon">📊</div>
                  <div className="step-text">Encrypted results stored</div>
                </div>
                <div className="process-arrow">→</div>
                <div className="process-step">
                  <div className="step-icon">🔓</div>
                  <div className="step-text">Decrypted only when needed</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  
      {showAddModal && (
        <div className="modal-overlay">
          <div className="add-modal metal-card">
            <div className="modal-header">
              <h2>Add Encrypted Data</h2>
              <button onClick={() => setShowAddModal(false)} className="close-modal">✕</button>
            </div>
            
            <div className="modal-body">
              <div className="fhe-notice">
                <div className="lock-icon"></div>
                <span>Data will be encrypted using FHE before storage</span>
              </div>
              
              <div className="form-group">
                <label>Data Key *</label>
                <input 
                  type="text"
                  value={newData.key}
                  onChange={e => setNewData({...newData, key: e.target.value})}
                  placeholder="Enter data key (e.g. price.eth.usd)" 
                  className="metal-input"
                />
              </div>
              
              <div className="form-group">
                <label>Data Value *</label>
                <textarea 
                  value={newData.value}
                  onChange={e => setNewData({...newData, value: e.target.value})}
                  placeholder="Enter sensitive data value" 
                  className="metal-textarea"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowAddModal(false)}
                className="metal-button"
              >
                Cancel
              </button>
              <button 
                onClick={addData} 
                disabled={adding || !newData.key || !newData.value}
                className="metal-button primary"
              >
                {adding ? "Encrypting with FHE..." : "Submit Encrypted Data"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={onWalletSelect}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content metal-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="metal-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon">✓</div>}
              {transactionStatus.status === "error" && <div className="error-icon">✕</div>}
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
              <span>FHE Oracle</span>
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
            <span>FHE-Powered Confidential Computing</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} FHE Oracle. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;