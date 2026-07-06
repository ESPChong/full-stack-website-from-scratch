terraform {
  backend "s3" {
    bucket         = "my-tf-state-bucket"
    key            = "dev/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "tf-locks" # for state locking
    encrypt        = true
  }
}