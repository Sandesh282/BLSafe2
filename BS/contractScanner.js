const ETHERSCAN_API_KEY = "J5D8QHZT219PRPX7W5CJVZXAMERACY9MGG";

async function fetchContractSource(address) {
    const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "1") throw new Error("Contract source fetch failed");
    return json.result[0].SourceCode;
  }
  
  function analyzeContractCode(source) {
    const lowerCode = source.toLowerCase();
    const risks = [];
  
    if (lowerCode.includes("onlyowner")) risks.push("⚠️ Ownership privilege found");
    if (lowerCode.includes("selfdestruct")) risks.push("⚠️ Selfdestruct present");
    if (lowerCode.includes("delegatecall")) risks.push("⚠️ Delegatecall usage");
    if (lowerCode.includes("tx.origin")) risks.push("⚠️ Insecure use of tx.origin");
  
    return risks.length
      ? { riskLevel: "🟡 Potential Issues", details: risks }
      : { riskLevel: "🟢 Safe", details: ["No common vulnerabilities found."] };
  }
  
  document.getElementById("scanContractBtn")?.addEventListener("click", async () => {
    const address = document.getElementById("contractInput").value.trim();
    const resultBox = document.getElementById("contractResult");
  
    if (!address) {
      alert("Enter contract address");
      return;
    }
  
    resultBox.innerHTML = "🔍 Scanning...";
  
    try {
      const source = await fetchContractSource(address);
      const result = analyzeContractCode(source);
  
      resultBox.innerHTML = `
        <strong>Risk Level:</strong> ${result.riskLevel}<br>
        <strong>Details:</strong><br>${result.details.join("<br>")}
      `;
    } catch (err) {
      resultBox.innerHTML = "❌ Error during scan.";
      console.error(err);
    }
  });