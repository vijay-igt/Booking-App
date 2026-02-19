/**
 * pricingService.ts
 * Frontend service for all dynamic pricing API calls.
 */
import api from '../api';
import type { PricingQuoteResponse, PricingRule, Coupon } from '../types';

export interface GetQuoteParams {
    showtimeId: number;
    seatIds: number[];
    couponCode?: string;
    paymentMethod?: string;
}

export const getPricingQuote = async (params: GetQuoteParams): Promise<PricingQuoteResponse> => {
    const seatIdsStr = params.seatIds.join(',');
    const query = new URLSearchParams({
        showtimeId: String(params.showtimeId),
        seatIds: seatIdsStr,
        ...(params.couponCode ? { couponCode: params.couponCode } : {}),
        ...(params.paymentMethod ? { paymentMethod: params.paymentMethod } : {}),
    });
    const res = await api.get(`/pricing/quote?${query.toString()}`);
    return res.data;
};

// ─── Pricing Rules (Super Admin) ──────────────────────────────────────────────

export const getPricingRules = async (): Promise<PricingRule[]> => {
    const res = await api.get('/pricing/rules');
    return res.data;
};

export const createPricingRule = async (data: Partial<PricingRule>): Promise<PricingRule> => {
    const res = await api.post('/pricing/rules', data);
    return res.data;
};

export const updatePricingRule = async (id: number, data: Partial<PricingRule>): Promise<PricingRule> => {
    const res = await api.put(`/pricing/rules/${id}`, data);
    return res.data;
};

export const deletePricingRule = async (id: number): Promise<void> => {
    await api.delete(`/pricing/rules/${id}`);
};

// ─── Coupons (Admin / Super Admin) ───────────────────────────────────────────

export const getCoupons = async (): Promise<Coupon[]> => {
    const res = await api.get('/pricing/coupons');
    return res.data;
};

export const createCoupon = async (data: Partial<Coupon>): Promise<Coupon> => {
    const res = await api.post('/pricing/coupons', data);
    return res.data;
};

export const updateCoupon = async (id: number, data: Partial<Coupon>): Promise<Coupon> => {
    const res = await api.put(`/pricing/coupons/${id}`, data);
    return res.data;
};

export const deleteCoupon = async (id: number): Promise<void> => {
    await api.delete(`/pricing/coupons/${id}`);
};
