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
import { loadAnalytics } from './lib/analytics';
import { AssessmentRecord } from './types';

type AppView = 'home' | 'assessment' | 'results' | 'dashboard' | 'history' | 'book' | 'pricing' | 'notfound';

export default function App() {
  const { status } = useSession();
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [assessmentResult, setAssessmentResult] = useState<AssessmentRecord | null>(null);
  const [history, setHistory] = useState<AssessmentRecord[]>([]);

  // Synchronize state with URL pathname updates (pushState & popstate)
  useEffect(() => {
    const handleUrlSync = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        setCurrentView('home');
      } else if (path === '/assessment') {
        setCurrentView('assessment');
      } else if (path === '/results') {
        setCurrentView('results');
      } else if (path === '/dashboard') {
        setCurrentView('dashboard');
      } else if (path === '/history') {
        setCurrentView('history');
      } else if (path === '/book') {
        setCurrentView('book');
      } else if (path === '/pricing') {
        setCurrentView('pricing');
      } else {
        setCurrentView('notfound');
      }
    };

    window.addEventListener('popstate', handleUrlSync);
    window.addEventListener('navigationchange', handleUrlSync);
    
    // Initial sync
    handleUrlSync();

    return () => {
      window.removeEventListener('popstate', handleUrlSync);
      window.removeEventListener('navigationchange', handleUrlSync);
    };
  }, []);

  // Update URL to match currentView state
  useEffect(() => {
    let targetPath = '/';
    if (currentView === 'assessment') targetPath = '/assessment';
    else if (currentView === 'results') targetPath = '/results';
    else if (currentView === 'dashboard') targetPath = '/dashboard';
    else if (currentView === 'history') targetPath = '/history';
    else if (currentView === 'book') targetPath = '/book';
    else if (currentView === 'pricing') targetPath = '/pricing';
    else if (currentView === 'notfound') targetPath = '/notfound';

    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
      window.dispatchEvent(new Event('navigationchange'));
    }
  }, [currentView]);

  // Load history on initial mount
  useEffect(() => {
    setHistory(loadAnalytics().history);
  }, []);

  // Update history list from localStorage when view changes
  const refreshHistory = () => {
    setHistory(loadAnalytics().history);
  };

  const handleStartAssessment = () => {
    setCurrentView('assessment');
    setAssessmentResult(null);
  };

  const handleAssessmentComplete = (result: AssessmentRecord) => {
    setAssessmentResult(result);
    refreshHistory();
    setCurrentView('results');
  };

  const handleNavigateHome = () => {
    refreshHistory();
    if (status === 'authenticated') {
      setCurrentView('');
    } else {
      setCurrentView('home');
    }
    setAssessmentResult(null);
  };

  const handleNavigateToHistory = () => {
    refreshHistory();
    if (status === 'authenticated') {
      setCurrentView('history');
    } else {
      setCurrentView('home');
    }
  };

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
        <DashboardPage onStartAssessment={handleStartAssessment} />
      )}

      {currentView === 'history' && (
        <HistoryPage />
      )}

      {currentView === 'book' && (
        <BookReferralPage />
      )}

      {currentView === 'pricing' && (
        <PricingPage />
      )}

      {currentView === 'notfound' && (
        <NotFound onGoHome={handleNavigateHome} />
      )}
    </RootLayout>
  );
}
