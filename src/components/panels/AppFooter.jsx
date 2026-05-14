export function AppFooter({ consensus }) {
  const updatedAt = consensus?.updated_at || consensus?.timestamp

  return (
    <footer className="app-footer" role="contentinfo">
      <span>HydraRec v2.0</span>
      <span className="footer-sources">
        Open-Meteo · INMET · OpenWeatherMap{updatedAt ? ` · ${updatedAt}` : ''}
      </span>
    </footer>
  )
}
