const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ModeratorDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startTag = '{/* ================= YOUTUBE importer TAB ================= */}';
const endTag = '{/* ================= VERIFICATION TAB ================= */}';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.error("Tags not found!", startIndex, endIndex);
  process.exit(1);
}

const replacement = `${startTag}
      {activeTab === 'youtube' && (
        <YouTubeImporterTab
          dbTeachers={dbTeachers}
          dbInstitutes={dbInstitutes}
          automatedFlowState={automatedFlowState}
          automatedStepIndex={automatedStepIndex}
          terminalLogs={terminalLogs}
          manifestData={manifestData}
          ingestionControlState={ingestionControlState}
          handleToggleApproved={handleToggleApproved}
          simulateQuotaError={simulateQuotaError}
          setSimulateQuotaError={setSimulateQuotaError}
          handleSimulateSyncChannelPlaylists={handleSimulateSyncChannelPlaylists}
          handleSimulateSyncPlaylistVideos={handleSimulateSyncPlaylistVideos}
          handleSimulateVerifyTeacherTrigger={handleSimulateVerifyTeacherTrigger}
          handleStartAutomatedIngestion={handleStartAutomatedIngestion}
          handleDownloadCSV={handleDownloadCSV}
          addTerminalLog={addTerminalLog}
        />
      )}

      `;

const newContent = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully replaced YouTube tab block!");
