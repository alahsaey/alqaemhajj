import { Pilgrim, CampaignSettings, PilgrimStatsConfig, HistoricalYearRecord } from '../types';
import { defaultCampaignSettings } from '../data/initialData';

export const isActivePilgrim = (p: Pilgrim): boolean => {
  return (
    p.status !== 'معتذر' &&
    p.status !== 'مرفوض' &&
    p.status !== 'محذوف' &&
    !p.isDeleted
  );
};

export const isPilgrimAirTravel = (p: Pilgrim): boolean => {
  const pkg = (p.selectedPackage || '').trim();
  const trans = (p.transport || '').trim();
  if (pkg.includes('طيران') || trans === 'طائرة' || trans.includes('طيران')) {
    return true;
  }
  if (
    Boolean(p.flightNumberOutbound?.trim()) ||
    Boolean(p.flightNumberReturn?.trim()) ||
    Boolean(p.flightTicketNumber?.trim())
  ) {
    return true;
  }
  return false;
};

export const isPilgrimBusTravel = (p: Pilgrim): boolean => !isPilgrimAirTravel(p);

export const getActiveSeasonYear = (campaignSettings?: CampaignSettings): string => {
  if (campaignSettings?.pilgrimStatsConfig?.activeSeasonYear?.trim()) {
    return campaignSettings.pilgrimStatsConfig.activeSeasonYear.trim();
  }
  const badge =
    campaignSettings?.siteTexts?.cardSeasonBadge ||
    campaignSettings?.siteTexts?.topBarAnnouncement ||
    '';
  const match = badge.match(/\d{4}/);
  if (match) {
    return match[0];
  }
  return '1448';
};

export const isPilgrimInSeason = (p: Pilgrim, targetYear: string = '1448'): boolean => {
  const cleanTarget = (targetYear || '1448').replace(/[^0-9]/g, '');

  // 1. Direct seasonYear property (Highest Priority)
  if (p.seasonYear && p.seasonYear.trim()) {
    const cleanSeasonYear = p.seasonYear.replace(/[^0-9]/g, '');
    return cleanSeasonYear === cleanTarget;
  }

  // 2. Direct hajjYear property
  if (p.hajjYear && p.hajjYear.trim()) {
    const cleanYear = p.hajjYear.replace(/[^0-9]/g, '');
    return cleanYear === cleanTarget;
  }

  // 2. season property (e.g. 'موسم حج 1448هـ')
  if (p.season && p.season.trim()) {
    const cleanSeason = p.season.replace(/[^0-9]/g, '');
    return cleanSeason.includes(cleanTarget);
  }

  // 3. Document ID format (e.g. `${nationalId}_1448`)
  if (p.id && p.id.includes('_')) {
    const parts = p.id.split('_');
    const suffix = parts[parts.length - 1].replace(/[^0-9]/g, '');
    if (suffix.length === 4) {
      return suffix === cleanTarget;
    }
  }

  // 4. Default fallback: If targetYear is '1448' and pilgrim has no conflicting year,
  // treat as current season
  return cleanTarget === '1448';
};

export const getActiveSeasonPilgrims = (
  pilgrims: Pilgrim[],
  targetYear?: string
): Pilgrim[] => {
  const year = targetYear || '1448';
  return (pilgrims || []).filter((p) => isPilgrimInSeason(p, year));
};

export interface PilgrimStatsBreakdown {
  activeSeasonYear: string;
  baseHistoricalCount: number;
  historicalRecordsTotal: number;
  pastYearsPilgrimsTotal: number;
  activeFlightPassengersCount: number;
  activeBusPassengersCount: number;
  currentSeasonPilgrimsCount: number;
  autoIncludeCurrentPassengers: boolean;
  totalPilgrims: number;
  historicalRecords: HistoricalYearRecord[];
}

export const getEffectivePilgrimStatsConfig = (
  campaignSettings?: CampaignSettings
): PilgrimStatsConfig => {
  const fallback = defaultCampaignSettings.pilgrimStatsConfig || {
    activeSeasonYear: '1448',
    baseHistoricalCount: 0,
    autoIncludeCurrentPassengers: true,
    historicalRecords: [],
  };

  if (!campaignSettings?.pilgrimStatsConfig) {
    return fallback;
  }

  return {
    activeSeasonYear:
      campaignSettings.pilgrimStatsConfig.activeSeasonYear?.trim() ||
      fallback.activeSeasonYear ||
      '1448',
    baseHistoricalCount: Math.max(
      0,
      Number(campaignSettings.pilgrimStatsConfig.baseHistoricalCount) || 0
    ),
    autoIncludeCurrentPassengers:
      campaignSettings.pilgrimStatsConfig.autoIncludeCurrentPassengers !== false,
    historicalRecords: Array.isArray(campaignSettings.pilgrimStatsConfig.historicalRecords)
      ? campaignSettings.pilgrimStatsConfig.historicalRecords
      : fallback.historicalRecords,
  };
};

export const calculatePilgrimStatsBreakdown = (
  pilgrims: Pilgrim[],
  campaignSettings?: CampaignSettings,
  customTargetYear?: string
): PilgrimStatsBreakdown => {
  const config = getEffectivePilgrimStatsConfig(campaignSettings);
  const activeSeasonYear = (customTargetYear || config.activeSeasonYear || '1448').trim();

  const baseHistoricalCount = Math.max(0, Number(config.baseHistoricalCount) || 0);
  const historicalRecordsTotal = (config.historicalRecords || []).reduce(
    (sum, rec) => sum + Math.max(0, Number(rec.pilgrimsCount) || 0),
    0
  );
  const pastYearsPilgrimsTotal = baseHistoricalCount + historicalRecordsTotal;

  // Filter ONLY active pilgrims belonging to the active season
  const activeList = (pilgrims || []).filter(
    (p) => isActivePilgrim(p) && isPilgrimInSeason(p, activeSeasonYear)
  );
  const activeFlightPassengersCount = activeList.filter(isPilgrimAirTravel).length;
  const activeBusPassengersCount = activeList.filter(isPilgrimBusTravel).length;
  const currentSeasonPilgrimsCount = activeFlightPassengersCount + activeBusPassengersCount;

  const autoIncludeCurrentPassengers = config.autoIncludeCurrentPassengers !== false;

  const totalPilgrims =
    pastYearsPilgrimsTotal +
    (autoIncludeCurrentPassengers ? currentSeasonPilgrimsCount : 0);

  return {
    activeSeasonYear,
    baseHistoricalCount,
    historicalRecordsTotal,
    pastYearsPilgrimsTotal,
    activeFlightPassengersCount,
    activeBusPassengersCount,
    currentSeasonPilgrimsCount,
    autoIncludeCurrentPassengers,
    totalPilgrims,
    historicalRecords: config.historicalRecords || [],
  };
};

export const formatPilgrimsCountWithPlus = (count: number): string => {
  const safeNum = Math.max(0, Math.round(Number(count) || 0));
  return `+${safeNum.toLocaleString('en-US')}`;
};
