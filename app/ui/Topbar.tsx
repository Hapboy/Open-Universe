import { useAppContext } from "../store/AppContext.tsx";

export function Topbar() {
  const { executeGraph, deferredInstallPrompt, setDeferredInstallPrompt } =
    useAppContext();

  const handleInstall = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log("PWA install:", outcome);
    setDeferredInstallPrompt(null);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <i className="ti ti-affiliate" />
        <span>Open Universe</span>
        <em id="branchTag">main · канон</em>
      </div>

      <div className="spacer" />

      <button className="tb" id="btnRun" onClick={() => void executeGraph()}>
        <i className="ti ti-player-play" />
        <span>Прогнать граф</span>
      </button>
      <TeamButton />
      {deferredInstallPrompt && (
        <button className="tb" onClick={handleInstall}>
          <i className="ti ti-download" />
          <span>Установить</span>
        </button>
      )}
    </header>
  );
}

function TeamButton() {
  const { team } = useAppContext();
  return (
    <button className="tb" id="btnTeam" data-open-modal="team">
      <i className="ti ti-users-group" />
      <span>Команда</span>
      <b>{team.length + 1}</b>
    </button>
  );
}
