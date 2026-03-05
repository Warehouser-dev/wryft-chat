import { Crown } from 'phosphor-react';

function PremiumBadge({ size = 16, showTooltip = true }) {
  return (
    <div className="premium-badge" title={showTooltip ? "Premium Member" : ""}>
      <Crown size={size} weight="fill" />
    </div>
  );
}

export default PremiumBadge;
