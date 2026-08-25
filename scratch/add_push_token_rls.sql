CREATE POLICY "Users can update their own profile push_token"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
