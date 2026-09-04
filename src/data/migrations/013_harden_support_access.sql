-- Phase 7 follow-up: prevent direct client-side workflow changes to support records.
-- Run after 012_phase7_support_hub.sql.
BEGIN;

DROP POLICY IF EXISTS "Ticket owner or admin" ON public.support_tickets;
CREATE POLICY "Ticket read by requester or admin" ON public.support_tickets FOR SELECT TO authenticated
  USING (public.can_manage_support(organisation_id) OR requester_user_id = auth.uid());
CREATE POLICY "Ticket create by requester" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid());
CREATE POLICY "Ticket administration" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.can_manage_support(organisation_id)) WITH CHECK (public.can_manage_support(organisation_id));

DROP POLICY IF EXISTS "Ticket participant or admin support_ticket_replies" ON public.support_ticket_replies;
CREATE POLICY "Reply read by participant or admin" ON public.support_ticket_replies FOR SELECT TO authenticated
  USING (public.can_manage_support(organisation_id) OR EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND st.organisation_id = organisation_id AND st.requester_user_id = auth.uid()));
CREATE POLICY "Reply create by participant or admin" ON public.support_ticket_replies FOR INSERT TO authenticated
  WITH CHECK (author_user_id = auth.uid() AND (public.can_manage_support(organisation_id) OR (is_internal = false AND EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND st.organisation_id = organisation_id AND st.requester_user_id = auth.uid()))));
CREATE POLICY "Reply administration" ON public.support_ticket_replies FOR UPDATE TO authenticated
  USING (public.can_manage_support(organisation_id)) WITH CHECK (public.can_manage_support(organisation_id));
CREATE POLICY "Reply deletion by admin" ON public.support_ticket_replies FOR DELETE TO authenticated
  USING (public.can_manage_support(organisation_id));

DROP POLICY IF EXISTS "Ticket participant or admin support_ticket_attachments" ON public.support_ticket_attachments;
CREATE POLICY "Attachment read by participant or admin" ON public.support_ticket_attachments FOR SELECT TO authenticated
  USING (public.can_manage_support(organisation_id) OR EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND st.organisation_id = organisation_id AND st.requester_user_id = auth.uid()));
CREATE POLICY "Attachment create by participant or admin" ON public.support_ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.can_manage_support(organisation_id) OR EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND st.organisation_id = organisation_id AND st.requester_user_id = auth.uid())));
CREATE POLICY "Attachment administration" ON public.support_ticket_attachments FOR UPDATE TO authenticated
  USING (public.can_manage_support(organisation_id)) WITH CHECK (public.can_manage_support(organisation_id));
CREATE POLICY "Attachment deletion by admin" ON public.support_ticket_attachments FOR DELETE TO authenticated
  USING (public.can_manage_support(organisation_id));

-- Activity is operational evidence: requesters may read their own ticket's
-- activity but cannot forge it through the browser REST API.
DROP POLICY IF EXISTS "Ticket participant or admin support_ticket_activity" ON public.support_ticket_activity;
CREATE POLICY "Activity read by participant or admin" ON public.support_ticket_activity FOR SELECT TO authenticated
  USING (public.can_manage_support(organisation_id) OR EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND st.organisation_id = organisation_id AND st.requester_user_id = auth.uid()));
CREATE POLICY "Activity administration" ON public.support_ticket_activity FOR ALL TO authenticated
  USING (public.can_manage_support(organisation_id)) WITH CHECK (public.can_manage_support(organisation_id));

DROP POLICY IF EXISTS "Feature requester or admin" ON public.feature_requests;
CREATE POLICY "Feature request read by requester or admin" ON public.feature_requests FOR SELECT TO authenticated
  USING (public.can_manage_support(organisation_id) OR requester_user_id = auth.uid());
CREATE POLICY "Feature request create by requester" ON public.feature_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid());
CREATE POLICY "Feature request administration" ON public.feature_requests FOR UPDATE TO authenticated
  USING (public.can_manage_support(organisation_id)) WITH CHECK (public.can_manage_support(organisation_id));

DROP POLICY IF EXISTS "Feature voters or admin" ON public.feature_request_votes;
CREATE POLICY "Feature vote read by participant or admin" ON public.feature_request_votes FOR SELECT TO authenticated
  USING (public.can_manage_support(organisation_id) OR user_id = auth.uid());
CREATE POLICY "Feature vote create by user" ON public.feature_request_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Feature vote deletion by user or admin" ON public.feature_request_votes FOR DELETE TO authenticated
  USING (public.can_manage_support(organisation_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Feedback owner or admin" ON public.customer_feedback;
CREATE POLICY "Feedback read by owner or admin" ON public.customer_feedback FOR SELECT TO authenticated
  USING (public.can_manage_support(organisation_id) OR user_id = auth.uid());
CREATE POLICY "Feedback create by user" ON public.customer_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMIT;
