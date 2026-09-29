from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_api_key: str = ""
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = "gpt-4o-mini"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def mode(self) -> str:
        return "live" if self.ai_api_key.strip() else "demo"
