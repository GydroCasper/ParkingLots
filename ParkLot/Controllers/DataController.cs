using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Web.Http;

namespace ParkLot.Controllers
{
    [RoutePrefix("api/data")]
    public class DataController : ApiController
    {
        [Route("")]
        public List<ParkingInterval> Get(string sourceUrl)
        {
            WebRequest request = WebRequest.Create(sourceUrl);
            request.Method = "GET";
            WebResponse response = request.GetResponse();

            var serializer = new JsonSerializer();

            using (var sr = new StreamReader(response.GetResponseStream()))
            using (var jsonTextReader = new JsonTextReader(sr))
            {
                return (List<ParkingInterval>)serializer.Deserialize(jsonTextReader, typeof(List<ParkingInterval>));
            }
        }
    }
}
