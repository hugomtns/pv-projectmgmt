import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDesignStore } from '@/stores/designStore';
import { useDesignFinancialStore } from '@/stores/designFinancialStore';
import { LoadingScreen } from '@/components/layout/LoadingScreen';

/**
 * Redirect from legacy /designs/:designId/financial route to new /financials/:projectId/:modelId route.
 * Provides backward compatibility for bookmarks and external links.
 */
export function LegacyFinancialRedirect() {
  const { designId } = useParams<{ designId: string }>();
  const navigate = useNavigate();

  const design = useDesignStore((state) =>
    state.designs.find((d) => d.id === designId)
  );
  const model = useDesignFinancialStore((state) =>
    state.getModelByDesign(designId || '')
  );

  useEffect(() => {
    if (design && model) {
      // Redirect to the finance-centric route
      navigate(`/financials/${design.projectId}/${model.id}`, { replace: true });
    } else if (design) {
      // Design exists but no model - go to project financial overview
      navigate(`/financials/${design.projectId}`, { replace: true });
    } else {
      // Design not found - go to financials dashboard
      navigate('/financials', { replace: true });
    }
  }, [design, model, navigate]);

  return <LoadingScreen />;
}
