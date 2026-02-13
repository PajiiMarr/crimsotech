import re

def convert_s3_to_public_url(s3_url):
    """
    Convert Supabase S3 URL to public URL format.
    
    S3 URL: https://project-ref.storage.supabase.co/storage/v1/s3/bucket-name/file-path
    Public URL: https://project-ref.supabase.co/storage/v1/object/public/bucket-name/file-path
    
    Returns the public URL, or original URL if conversion fails.
    """
    if not s3_url:
        return None
    
    try:
        # Method 1: Regex extraction
        match = re.search(r'https://([^\.]+)\.storage\.supabase\.co/storage/v1/s3/([^/]+)/(.+)', s3_url)
        
        if match:
            project_ref = match.group(1)
            bucket_name = match.group(2)
            file_path = match.group(3)
            return f"https://{project_ref}.supabase.co/storage/v1/object/public/{bucket_name}/{file_path}"
        
        # Method 2: Simple string replacement
        if "/s3/" in s3_url:
            public_url = s3_url.replace("/s3/", "/object/public/")
            public_url = public_url.replace(".storage.supabase.co", ".supabase.co")
            return public_url
            
    except Exception as e:
        print(f"Error converting URL {s3_url}: {e}")
    
    return s3_url