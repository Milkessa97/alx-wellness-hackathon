'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { RootLayout } from './app/layout';
import { HomePage } from './app/page';
import { AssessmentPage } from './app/assessment/page';
import { ResultsPage } from './app/results/page';
import { NotFound } from './app/not-found';
import { DashboardPage } from './app/dashboard/page';
import { HistoryPage } from './app/history/page';
import { BookReferralPage } from './app/book/page';
import { PricingPage } from './app/pricing/page';
import { BusinessPricingPage } from './app/forbusiness/page';
import MoodPage from './app/mood/page';

import { loadAnalytics } from './lib/analytics';
import { AssessmentRecord } from './types';

type AppView =
  | 'home'
  | 'assessment'
  | 'results'
  | 'dashboard'
  | 'history'
  | 'book'
  | 'pricing'
  | 'forbusiness'
  | 'notfound';

const PATH_MAP: Record<AppView, string> = {
  home: '/',
  assessment: '/assessment',
  results: '/results',
  dashboard: '/dashboard',
  history: '/history',
  book: '/book',
  pricing: '/pricing',
  forbusiness: '/forbusiness',
  notfound: '/notfound',
};

const VIEW_MAP: Record<string, AppView> = {
  '/': 'home',
  '/assessment': 'assessment',
  '/results': 'results',
  '/dashboard': 'dashboard',
  '/history': 'history',
  '/book': 'book',
  '/pricing': 'pricing',
  '/forbusiness': 'forbusiness',
  '/notfound': 'notfound',
};

export default function App() {
  const { status } = useSession();

  const [currentView, setCurrentView] = useState<AppView>('home');
  const [assessmentResult, setAssessmentResult] =
    useState<AssessmentRecord | null>(null);
  const [history, setHistory] = useState<AssessmentRecord[]>([]);

  // URL -> View
  useEffect(() => {
    const syncFromUrl = () => {
      const pathname = window.location.pathname;
      // /mood is a standalone, pre-router page (see render bypass below) — never
      // map it to a view, or its ?token= query would be lost on the next effect.
      if (pathname === '/mood') return;
      setCurrentView(VIEW_MAP[pathname] ?? 'notfound');
    };

    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('navigationchange', syncFromUrl);

    syncFromUrl();

    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('navigationchange', syncFromUrl);
    };
  }, []);

  // View -> URL
  useEffect(() => {
    // Don't rewrite the URL while the standalone /mood page is showing.
    if (window.location.pathname === '/mood') return;

    const targetPath = PATH_MAP[currentView];

    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
      // Notify usePathname() so the navbar's active link stays in sync for
      // navigations that go through setCurrentView (History, logo, results, …).
      window.dispatchEvent(new Event('navigationchange'));
    }
  }, [currentView]);

  useEffect(() => {
    setHistory(loadAnalytics().history);
  }, []);

  const refreshHistory = () => {
    setHistory(loadAnalytics().history);
  };

  const navigateTo = (path: string) => {
    const view = VIEW_MAP[path] ?? 'notfound';

    window.history.pushState({}, '', path);
    setCurrentView(view);
  };

  const handleStartAssessment = () => {
    setAssessmentResult(null);
    setCurrentView('assessment');
  };

  const handleAssessmentComplete = (result: AssessmentRecord) => {
    setAssessmentResult(result);
    refreshHistory();
    setCurrentView('results');
  };

  const handleNavigateHome = () => {
    refreshHistory();
    setAssessmentResult(null);

    setCurrentView('home');
  };

  const handleNavigateToHistory = () => {
    refreshHistory();

    setCurrentView(
      status === 'authenticated'
        ? 'history'
        : 'home'
    );
  };

  // Standalone email-link page: render outside RootLayout and the VIEW_MAP
  // router. App stays mounted so the page's navigationchange back-links work.
  if (window.location.pathname === '/mood') {
    return <MoodPage />;
  }

  return (
    <RootLayout
      onNavigateHome={handleNavigateHome}
      onNavigateToHistory={handleNavigateToHistory}
    >
      {currentView === 'home' && (
        <HomePage
          history={history}
          onStartAssessment={handleStartAssessment}
          onNavigateToHistory={handleNavigateToHistory}
        />
      )}

      {currentView === 'assessment' && (
        <AssessmentPage
          onComplete={handleAssessmentComplete}
          onCancel={handleNavigateHome}
        />
      )}

      {currentView === 'results' && (
        <ResultsPage
          latestResult={assessmentResult}
          onRetake={handleStartAssessment}
          onNavigateHome={handleNavigateHome}
        />
      )}

      {currentView === 'dashboard' && (
        <DashboardPage
          onStartAssessment={handleStartAssessment}
        />
      )}

      {currentView === 'history' && <HistoryPage />}

      {currentView === 'book' && <BookReferralPage />}

      {currentView === 'pricing' && <PricingPage />}

      {currentView === 'forbusiness' && (
        <BusinessPricingPage onNavigate={navigateTo} />
      )}

      {currentView === 'notfound' && (
        <NotFound onGoHome={handleNavigateHome} />
      )}
    </RootLayout>
  );
}