# Supabase Storage 设置说明

为了支持Logo上传功能，需要在Supabase中设置Storage bucket。

## 设置步骤

1. **登录Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择您的项目

2. **创建Storage Bucket**
   - 进入 Storage 页面
   - 点击 "New bucket"
   - Bucket名称：`public`
   - 设置为 Public bucket（允许公开访问）
   - 点击 "Create bucket"

3. **设置Bucket策略**
   如果需要更细粒度的控制，可以设置RLS策略：

   ```sql
   -- 允许认证用户上传文件
   CREATE POLICY "Allow authenticated uploads" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'public');

   -- 允许所有人查看公开文件
   CREATE POLICY "Allow public access" ON storage.objects
   FOR SELECT TO public
   USING (bucket_id = 'public');

   -- 允许用户删除自己上传的文件
   CREATE POLICY "Allow users to delete own files" ON storage.objects
   FOR DELETE TO authenticated
   USING (bucket_id = 'public' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

4. **文件夹结构**
   上传的Logo文件将按以下结构存储：
   ```
   public/
   └── tenant-logos/
       └── {tenant-id}/
           └── {timestamp}.{extension}
   ```

## 注意事项

- 确保Supabase项目的Storage服务已启用
- 文件大小限制设置为5MB
- 支持的图片格式：JPG, PNG, GIF
- 文件会自动获得公开访问URL

## 测试

上传功能创建后，可以通过管理员界面测试：
1. 登录管理员账号
2. 进入管理界面
3. 在租户设置中上传Logo
4. 确认图片正确显示
